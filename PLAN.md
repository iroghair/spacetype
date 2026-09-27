# SpaceType — Work Plan

A space-themed touch-typing game for Dutch kids aged 9–13, built as a static web app hosted on GitHub Pages.

- **Repo:** `spacetype` (public)
- **Live URL:** `https://<github-user>.github.io/spacetype/`

---

## 1. Concept

Letters, words or sentences fly from right to left through space. A vertical laser on the left edge burns anything that reaches it. Type a letter correctly in time and it bursts into confetti; get it wrong and it burns up in a small firework of fire particles. A three-line text panel at the top shows what was typed, what is being typed, and what comes next. Points, combos, a strokes-per-minute meter and plenty of celebration keep kids motivated. An on-screen keyboard with hands shows which finger to use.

- **Audience:** kids 9–13, Dutch by default.
- **Device:** laptop/desktop with a physical keyboard. Touch-only devices get a "keyboard needed" message.

---

## 2. Screen layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Score 12 340   Combo 27 (x3)   aanslagen/min ▮▮▮▮▮▯▯ 84   96%    │  HUD
│        r                                                         │  wrong key actually typed (small, red)
│   de kat zit op de mat                                           │  typed line (the 't' of 'kat' is red)
│          k                                                       │  wrong key actually typed (small, red)
│   het visje zwemt in de sloot                                    │  current line (the 'j' of 'visje' is red)
│                   ▲                                              │  arrow under the active letter
│   morgen gaan we naar het strand                                 │  next line
├──────────────────────────────────────────────────────────────────┤
│ ┃      ·            ·          ·                ·                │
│ ┃        i n · d e · s l o o t · m o r g e n                     │  play field (Phaser canvas)
│ ┃        ▲                                                       │  same arrow under the next flying letter
│ ┃   ·          ·           ·           ·                         │
├──────────────────────────────────────────────────────────────────┤
│        [ on-screen keyboard, keys coloured per finger ]          │  finger guide
│        [ two stylised hands, active finger lit ]                 │  (toggleable)
└──────────────────────────────────────────────────────────────────┘
```

- 16:9, scales to fit the window; minimum target 1280×720.
- Stars drift slowly left → right, low contrast, never distracting (direction is a config value).
- Large, highly legible font (e.g. Atkinson Hyperlegible, self-hosted) where l / I / 1 are clearly different.

### Text panel details

- **Active letter:** a small arrow (▲) sits directly below the letter to type next in the current line. It slides to the next letter after each stroke (short tween, no jumping). There is no other text cursor.
- **Play-field arrow:** the same arrow, in the same colour, sits under the next flying letter and moves with it, so the eye can find the active letter in both places.
- **Correct stroke:** the letter turns green.
- **Wrong stroke:** the intended letter turns red, and the key actually typed appears small and red directly above it. The mark stays when the line moves up to the typed line.
  - A wrongly typed space shows as `␣` above the letter.
  - If a space was expected and a letter was typed, the space shows as a red `·` with the typed letter above it.
- **Burned untyped** (reached the laser): the letter is red with nothing above it.
- Every line reserves room for the marks above it (and the current line for the arrow below it), so nothing shifts when a mark appears.

---

## 3. Game rules

1. The flying items **are** the current line. They are typed strictly in order; the next letter to type is always the one nearest the laser, marked by the arrow.
2. Every keystroke consumes exactly one letter, and strokes are final (Backspace does nothing):
   - **correct** → green in the panel, the letter bursts into confetti;
   - **wrong** → red in the panel with the typed key shown above it (see 2. Text panel details); the letter keeps flying and burns at the laser.
3. A letter that reaches the laser untyped burns (fire particles), counts as a miss, and the cursor skips past it.
4. In word and sentence levels, words fly as groups. Spaces must be typed too and appear as a faint dot between words. Letters within a word explode individually.
5. Stream speed is derived from the level's target SPM, so typing at target pace keeps letters clear of the laser. If the child types ahead, the stream speeds up so the next letters are always visible; typing fast is never held back.
6. A level is a fixed run of characters (about 2–3 minutes at target pace) and ends with a results screen.

### Scoring

- Points per correct stroke × combo multiplier.
- **Combo** = consecutive correct strokes; any wrong key or miss resets it.
- **Tiers** (tunable): 10 → x2, 25 → x3, 50 → x4, 100 → x5. Every tier-up triggers a celebration.
- Bonus for a flawless word.
- **SPM** = correct strokes per minute ("aanslagen per minuut" in the Dutch UI). The live meter uses a rolling 20-second window; the results screen shows the whole-level value. Accuracy % is shown alongside.
- **Results screen:** SPM, accuracy, score, best combo, and 1–3 stars based on accuracy and SPM vs. target. Also lists the most-confused keys (e.g. "j → k, 4×") so kids and parents see what to practise.

### Celebrations (doing better than your level)

- **Combo tier-ups:** popup text ("Goed zo!", "Super!", "Fantastisch!", "Niet te stoppen!"), laser changes colour, stars briefly speed up.
- **Turbo:** live SPM ≥ 120 % of target for 10 s → turbo mode (streaking stars, glowing letters, bonus multiplier).
- **New personal best** (SPM or score): big fireworks and a "Nieuw record!" banner.
- **Level complete:** fireworks and an animated star rating.
- **Sprites:** a mascot and fly-bys (rocket, UFO, astronaut) at tier-ups and records.
- **Sound:** the correct-stroke sound rises in pitch as the combo grows.

---

## 4. Finger guide

- On-screen keyboard (US-QWERTY, the standard layout in NL), generated in code, with keys coloured by finger using the standard touch-typing zones.
- The next key pulses. For capitals, the **opposite-hand** Shift pulses too.
- Two stylised hands (simple SVG shapes, not realistic) below the keyboard; the finger for the next key lights up in its colour.
- Toggle in settings; on by default.
- The key → finger mapping is a plain lookup table with unit tests. The drawing sits on top of it, so a nicer hand illustration can be swapped in later without touching the logic.

---

## 5. Levels & content

Draft progression; tune after playtesting. Each level adds keys. Within a level the run goes: **new-key drill → mixed drill of all learned keys → real words using only learned keys** (once enough such words exist).

| #   | Name (UI, NL)         | New keys  | Target SPM (start value) |
| --- | --------------------- | --------- | ------------------------ |
| 1   | Thuisrij: f j         | f j space | 30                       |
| 2   | Thuisrij: d k         | d k       | 35                       |
| 3   | Thuisrij: a s l       | a s l     | 40                       |
| 4   | Thuisrij compleet     | g h       | 45                       |
| 5   | Bovenrij: e i         | e i       | 50                       |
| 6   | Bovenrij: r u         | r u       | 55                       |
| 7   | De n en de t          | n t       | 60                       |
| 8   | Bovenrij: w o         | w o       | 60                       |
| 9   | Onderrij: v b m       | v b m     | 65                       |
| 10  | Onderrij: c , .       | c , .     | 70                       |
| 11  | Laatste letters       | p z y q x | 70                       |
| 12  | Hoofdletters          | Shift     | 70                       |
| 13  | Leestekens            | ? ! : -   | 75                       |
| 14  | Korte zinnen          | —         | 80                       |
| 15  | Lange zinnen          | —         | 90                       |
| 16+ | Onderwerpen (phase 6) | —         | 90+                      |

**Excluded characters (for now):** words and sentences containing diacritics (ë, é, ï, ö) or apostrophes/quotes (auto's, zo'n). On the US-International layout these are dead keys and behave unexpectedly. This could become a setting later.

### Content files

```
content/nl/
  levels.json      # level definitions: keys, target SPM, run length, content mix
  words.txt        # one word per line, lowercase, kid-appropriate
  sentences.txt    # one sentence per line
  topics/          # phase 6
```

- `npm run content` validates the files (allowed characters, no duplicates), computes a difficulty score per word and sentence, assigns each word to the earliest level whose keys cover it, and writes sorted JSON to `public/content/nl/`. CI runs it before every build.
- **Difficulty heuristic** (documented and unit-tested): length, number of distinct keys, share of keys off the home row, capitals, punctuation.
- **Starter content:** Claude writes about 800 common, kid-appropriate Dutch words and about 150 simple sentences. Everything is plain text so the owner can review and edit it.

---

## 6. Tech stack

| Part                                 | Choice                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Language & build                     | TypeScript + Vite (static build)                                                                                                          |
| Play field                           | Phaser (latest stable): starfield, flying letters, laser, particles, tweens                                                               |
| HUD, text panel, menus, finger guide | Plain HTML/CSS overlay; SVG for keyboard and hands                                                                                        |
| Big celebrations                     | canvas-confetti                                                                                                                           |
| Sound                                | Phaser sound (Web Audio); CC0 effects from Kenney.nl or generated with jsfxr                                                              |
| Tests                                | Vitest (unit), Playwright (smoke test + screenshots for visual checks)                                                                    |
| Hosting                              | GitHub Actions → GitHub Pages                                                                                                             |
| Saved data                           | localStorage for settings and personal bests (per device; each child uses their own device, so this doubles as a simple per-child record) |

---

## 7. Architecture

```
src/
  engine/   Pure TypeScript, no Phaser/DOM: typing state, stream timing, scoring,
            combo, SPM, level runner. Emits events. Fully unit-tested.
  game/     Phaser scenes (Boot, Play) and effects (starfield, letters, laser, particles)
  ui/       DOM overlay: HUD, text panel, level select, results, settings, finger guide
  audio/    Sound manager, driven by engine events
  content/  Loads generated level/word/sentence JSON; TextSource interface
  input/    The single keyboard listener → engine
  i18n/     nl.json (default), en.json
  storage/  Versioned localStorage wrapper
  config.ts All tunables: speeds, combo tiers, colours, directions, durations, particle caps
```

**Engine state per character:** `pending | correct | wrong | missed`, plus the key actually typed for `wrong`. The text panel and the results screen's confused-keys list both read from this.

**Event flow:** keyboard → `input` → `engine` → events (`strokeCorrect`, `strokeWrong` (with expected and typed key), `letterMissed`, `comboTier`, `turboStart`/`turboEnd`, `levelComplete`, `newRecord`) → `game` / `ui` / `audio` react. Rendering never decides game outcomes.

---

## 8. Phases

Each phase gets its own branch and PR. CI must be green, the PR is merged to `main` (which deploys), and the owner play-tests before the next phase starts. Tick boxes as work completes.

### Phase 1 — Skeleton & deploy

The owner does this first: create a **public** GitHub repo named `spacetype`, then go to Settings → Pages → Source and select **GitHub Actions**.

- [x] Vite + TypeScript + Phaser project (Phaser's official Vite/TS template is a fine start); Vitest configured
- [x] Scripts: `dev`, `build`, `test`, `typecheck`, `content`
- [x] Vite `base` read from an env var; the workflow sets it to `/spacetype/` (local dev uses `/`)
- [x] Workflow: on PR → typecheck, test, build; on push to `main` → same, then deploy to Pages
- [x] Placeholder Play scene: dark space, drifting starfield, laser line

**Done when:** `https://<github-user>.github.io/spacetype/` shows the starfield and laser.

### Phase 2 — Core loop

- [x] Engine: character stream, cursor, stroke handling per rules 1–5, miss detection, per-character state including the typed key for wrong strokes; unit tests for every rule
- [x] Input module (see keyboard gotchas in CLAUDE.md)
- [x] Flying letters rendered from engine state; laser burns misses (simple placeholder effect)
- [x] Three-line text panel: active-letter arrow, green/red colouring, wrong keys shown above (see 2. Text panel details)
- [x] Arrow under the next flying letter in the play field
- [x] Hard-coded test content for level 1
- [x] Playwright smoke test: load, start, type correct keys (score changes), type one wrong key (red letter with the typed key above it)

**Done when:** a child can play a level-1 run from start to finish, with placeholder effects.

### Phase 3 — Levels, scoring & menus

- [x] Content pipeline (`npm run content`) and starter word/sentence lists
- [x] `levels.json` for levels 1–15; level runner with the drill → mix → words sequence
- [x] Score, combo tiers, SPM meter, accuracy, flawless-word bonus
- [x] Level select screen (all levels open) and results screen with stars and most-confused keys
- [x] Personal bests per level in localStorage

**Done when:** every level is playable from the menu and results are saved.

### Phase 4 — Finger guide

- [x] Key → finger mapping table and tests, including opposite-hand Shift
- [x] On-screen keyboard: colour-coded zones, next-key pulse
- [x] Stylised hands with the active finger highlighted
- [x] Settings toggle; Playwright screenshots reviewed for correctness

**Done when:** for every key used in levels 1–13, the guide shows the right key and the right finger.

### Phase 5 — Effects & sound

- [x] Confetti burst per correct letter; fire/firework burst per burned letter
- [x] Combo-tier celebrations, turbo mode, record banner, level-complete fireworks, mascot and fly-by sprites
- [x] Sound effects: correct (pitch rises with combo), wrong, burn, tier-up, turbo, level complete, record. Optional ambient music loop, off by default.
- [x] Audio unlocks on the first key press; mute and volume in settings
- [ ] Performance: steady 60 fps on a modest laptop; particle counts capped in config _(caps done; 60 fps to be confirmed by the owner on a real laptop)_

**Done when:** the kids say "wow" (the owner judges).

### Phase 6 — Topic texts

- [x] `scripts/generate_topic_texts.py`: a Python script the owner runs locally. The API key is read from `.env`, which is git-ignored. It generates texts for the topics _vissen, muziek, Minecraft, sport, strips_ at several difficulty bands, with these constraints: ages 9–13, Dutch, no diacritics or apostrophes, kid-safe, original text.
- [x] Output goes to `content/nl/topics/<topic>.pending.txt`. The owner reviews it and moves approved lines to `<topic>.txt`; only approved files are built.
- [x] Topic picker (5 options) → a topic run at the chosen difficulty
- [x] `TextSource` interface, so a live generator can be added later

**Done when:** kids can pick a topic and type reviewed texts about it.

### Later (not scheduled)

- Profiles and cross-device progress (needs an export/import code or a small backend)
- Unlockable progression and a placement test
- Live text generation for free-text interests (needs a server-side key proxy and moderation)
- English content and UI, number row, other keyboard layouts
- Installable offline app (PWA)

---

## 9. Open decisions

- Tuning of speeds, SPM targets and combo tiers after the first playtests
- **How forgiving the stream is:** the next letter waits about 10 slots from the laser (`stream.comfortSlots`), i.e. 20 s at 30 SPM or 7 s at 90 SPM before it burns. Tune in playtests.
- **Stars:** 3 stars = at least 95% accuracy and on target SPM; 2 stars = 85% and 75% of target; otherwise 1 (`scoring.stars` in `src/config.ts`).
- **Flawless-word bonus:** 20 points × multiplier for every word (2+ letters) typed without a mistake.
- **Personal record:** "Nieuw record!" shows when score or SPM beats an earlier result of the same level (not on the very first play).
- **Level 12–15 content:** level 12 mixes capitalised words with short sentences; 13 uses sentences with ? ! : -; 14 short sentences (≤ 30 characters); 15 long sentences (31+). Tune in `content/nl/levels.json`.
- **Finger guide:** space lights up both thumbs; 6 is typed with the right index finger. To make room, the text panel and play field are now 216 px each and the guide 240 px (`layout` in `src/config.ts`).
- **Laser look:** full screen height, sine wave with 12 periods, peaks moving down, amplitude swinging +1 → -1 over 4 s (`laser` in `src/config.ts`). Its glow changes colour with each combo tier.
- **Turbo:** live SPM ≥ 120% of target for 10 s doubles points until the pace drops (`scoring.turbo`).
- **Sounds and sprites** are made in code (no files), so there is nothing to license. Music is off by default.
- **Topic difficulty bands** follow from text length (`content/nl/topics/topics.json`): Makkelijk ≤ 45 characters (60 SPM), Gemiddeld ≤ 90 (75 SPM), Moeilijk ≤ 160 (90 SPM). The generator asks for texts of the right length per band; the pipeline sorts approved texts into bands by length.
- **Topic generator model:** Claude Opus 5 (`claude-opus-5`) with structured output, and `fallbacks: "default"` so a declined request is retried on a fallback model.
