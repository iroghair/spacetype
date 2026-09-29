"""Generate typing texts about a topic with Claude, for the owner to review.

Writes new texts to content/nl/topics/<topic>.pending.txt. Nothing there is
used by the game: read the file, and move the lines you approve to
content/nl/topics/<topic>.txt. Then run `npm run content` to check them.

Setup (once):
    python3 -m venv .venv
    .venv/bin/pip install -r scripts/requirements.txt
    echo "ANTHROPIC_API_KEY=sk-ant-..." > .env        # .env is git-ignored

Examples:
    .venv/bin/python scripts/generate_topic_texts.py                     # every topic and band, 10 texts each
    .venv/bin/python scripts/generate_topic_texts.py --topics vissen --bands 1 2 --count 15
    .venv/bin/python scripts/generate_topic_texts.py --dry-run           # show the prompt, don't call the API

Topics, bands and their lengths come from content/nl/topics/topics.json.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPICS_DIR = ROOT / "content" / "nl" / "topics"

MODEL = "claude-opus-5"

# Same rules as the game's content pipeline (scripts/contentLib.mjs): letters,
# spaces and , . ? ! : -  only. Accents and apostrophes are dead keys on the
# US-International keyboard layout that many Dutch kids use, so they're out.
ALLOWED = re.compile(r"^[A-Za-z ,.?!:-]+$")

# The shortest text worth typing in band 1.
MIN_LENGTH = 15

SYSTEM_PROMPT = """\
You write short Dutch texts for SpaceType, a touch-typing game for Dutch children aged 9 to 13. \
A child types each text letter by letter while it flies across the screen, so every text should be \
pleasant to read, easy to follow, and worth typing.

What the texts must be like:
- Natural, correct Dutch that a 9 to 13 year old understands. Each text is one to three sentences, \
with normal capital letters and punctuation.
- Friendly and suitable for children: no violence (mild game-style danger is fine), nothing scary, \
no romance, no bad language, no advertising, and no real people's personal details. Facts you state \
must be correct.
- Original: do not quote or closely copy song lyrics, books, comics, games or other existing texts.
- Only these characters: the letters a-z and A-Z, spaces, and , . ? ! : -
  That means no accents or other diacritics, no apostrophes or quotes, and no digits (write numbers \
as words). The keyboard layout many Dutch children use turns accents and apostrophes into "dead keys" \
that behave unexpectedly. Rather than misspelling a word that normally has an accent or apostrophe \
(like één, café, ideeën, zo'n or auto's), choose other words.
- Varied: different sentence shapes, different angles on the topic, no two texts that say nearly the \
same thing, and nothing that repeats the existing texts you are shown.
"""


def load_dotenv(path: Path) -> None:
    """Read KEY=value lines from .env into the environment (without overriding what is already set)."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def read_lines(path: Path) -> list[str]:
    """Non-empty, non-comment lines of a text file (empty list if it doesn't exist)."""
    if not path.exists():
        return []
    lines = (line.strip() for line in path.read_text(encoding="utf-8").splitlines())
    return [line for line in lines if line and not line.startswith("#")]


def band_range(bands: list[dict], band_id: int) -> tuple[int, int]:
    """(shortest, longest) length in characters for a band: just above the previous band's maximum."""
    index = next(i for i, b in enumerate(bands) if b["id"] == band_id)
    low = MIN_LENGTH if index == 0 else bands[index - 1]["maxLength"] + 1
    return low, bands[index]["maxLength"]


def check_text(text: str, low: int, high: int, existing: set[str]) -> str | None:
    """Why a generated text can't be used, or None if it's fine."""
    if not ALLOWED.match(text):
        bad = sorted(set(c for c in text if not ALLOWED.match(c)))
        return f"characters not allowed: {' '.join(bad)}"
    if "  " in text:
        return "double space"
    if not low <= len(text) <= high:
        return f"length {len(text)}, should be {low}-{high}"
    if text.lower() in existing:
        return "already exists"
    return None


def build_prompt(topic: dict, band: dict, low: int, high: int, count: int, examples: list[str]) -> str:
    shown = "\n".join(f"- {t}" for t in examples[-40:]) or "(none yet)"
    return (
        f"Topic: {topic['name']} ({topic['about']}).\n"
        f"Difficulty: {band['name']}. Each text must be between {low} and {high} characters long, "
        f"spaces and punctuation included.\n"
        f"Write {count} new texts about this topic.\n\n"
        f"Existing texts for this topic (don't repeat these):\n{shown}"
    )


# Structured output: Claude answers with exactly this JSON shape.
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {"texts": {"type": "array", "items": {"type": "string"}}},
    "required": ["texts"],
    "additionalProperties": False,
}


def ask_claude(client, prompt: str) -> list[str] | None:
    """Ask Claude for texts. Returns None (after printing why) if there is no usable answer."""
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
        # If Claude's safety checks decline a request, let the API retry it on
        # a suitable fallback model instead of returning nothing.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal":
        print("  Claude declined this request; skipping.")
        return None
    if response.stop_reason == "max_tokens":
        print("  The answer was cut off (too long); skipping. Try a smaller --count.")
        return None
    text = next((b.text for b in response.content if b.type == "text"), "")
    return [t.strip() for t in json.loads(text)["texts"]]


def generate(client, config: dict, topic_ids: list[str], band_ids: list[int], count: int, dry_run: bool) -> None:
    bands = config["bands"]
    today = datetime.date.today().isoformat()
    for topic in (t for t in config["topics"] if t["id"] in topic_ids):
        approved_file = TOPICS_DIR / f"{topic['id']}.txt"
        pending_file = TOPICS_DIR / f"{topic['id']}.pending.txt"
        known = read_lines(approved_file) + read_lines(pending_file)
        existing = {t.lower() for t in known}

        for band in (b for b in bands if b["id"] in band_ids):
            low, high = band_range(bands, band["id"])
            print(f"{topic['name']} - {band['name']} ({low}-{high} characters)")
            prompt = build_prompt(topic, band, low, high, count, known)
            if dry_run:
                print("\n--- system ---\n" + SYSTEM_PROMPT + "\n--- user ---\n" + prompt + "\n")
                continue

            texts = ask_claude(client, prompt)
            if texts is None:
                continue
            accepted = []
            for text in texts:
                problem = check_text(text, low, high, existing)
                if problem:
                    print(f"  skipped ({problem}): {text}")
                    continue
                accepted.append(text)
                existing.add(text.lower())
                known.append(text)

            if accepted:
                with pending_file.open("a", encoding="utf-8") as f:
                    f.write(
                        f"\n# {band['name']} - generated {today} - check each line; "
                        f"move the good ones to {approved_file.name}\n"
                    )
                    f.write("\n".join(accepted) + "\n")
            print(f"  {len(accepted)} new texts -> {pending_file.relative_to(ROOT)}")


def main() -> int:
    config = json.loads((TOPICS_DIR / "topics.json").read_text(encoding="utf-8"))
    topic_ids = [t["id"] for t in config["topics"]]
    band_ids = [b["id"] for b in config["bands"]]

    parser = argparse.ArgumentParser(description="Generate topic texts with Claude for review.")
    parser.add_argument("--topics", nargs="+", choices=topic_ids, default=topic_ids)
    parser.add_argument("--bands", nargs="+", type=int, choices=band_ids, default=band_ids)
    parser.add_argument("--count", type=int, default=10, help="texts to ask for per topic and band")
    parser.add_argument("--dry-run", action="store_true", help="print the prompts without calling Claude")
    args = parser.parse_args()

    if args.dry_run:
        generate(None, config, args.topics, args.bands, args.count, dry_run=True)
        return 0

    load_dotenv(ROOT / ".env")
    import anthropic  # imported here so --dry-run works without the package installed

    client = anthropic.Anthropic()
    try:
        generate(client, config, args.topics, args.bands, args.count, dry_run=False)
    except anthropic.AuthenticationError:
        print("The API key was not accepted. Check ANTHROPIC_API_KEY in .env.")
        return 1
    except anthropic.RateLimitError:
        print("Too many requests right now (rate limit). Wait a minute and run again.")
        return 1
    except anthropic.APIConnectionError:
        print("Could not reach the Claude API. Check your internet connection.")
        return 1
    except anthropic.APIStatusError as error:
        print(f"The Claude API returned an error ({error.status_code}): {error.message}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
