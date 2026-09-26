# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

**SpaceType** (repo `spacetype`) is a space-themed touch-typing game for Dutch kids aged 9–13, built as a static web app. It is served from GitHub Pages under the sub-path `/spacetype/`, so every asset URL must respect Vite's `base`. The full spec and phased plan are in `PLAN.md`. Read it before starting work, and work on **one phase at a time**.

## Owner

The owner is comfortable with Python but new to JavaScript/TypeScript and web tooling.

- Write PR descriptions in plain terms: what changed, how to try it, and anything to check by hand.
- Prefer readable code over clever code. Comment the non-obvious parts.
- When PLAN.md doesn't cover a decision, pick the simplest option and say so in the PR. If it matters for the game, add it to "Open decisions" in PLAN.md.

## Commands

Create these in phase 1 and keep this list in sync.

```
npm install
npm run dev         # local dev server (runs `content` first)
npm run build       # production build (runs `content` first)
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright smoke test
npm run typecheck   # tsc --noEmit
npm run content     # validate + sort content into public/content/
```

## Architecture rules

- `src/engine/` is pure TypeScript: no Phaser, no DOM, no timers (time is passed in). All game rules live here and are unit-tested.
- Rendering (Phaser and DOM) only reacts to engine state and events. It never decides outcomes.
- There is one keyboard listener, in `src/input/`, and it feeds the engine.
- All tunables live in `src/config.ts`. No magic numbers in scenes.
- All user-facing text goes through `src/i18n/` (Dutch is the default). Never hard-code UI strings.
- Keep dependencies minimal: Phaser, canvas-confetti, Vite, Vitest, Playwright, Prettier, @types/node (type descriptions only, dev-only). Ask before adding anything else.

## Keyboard input gotchas

- Compare `event.key` (the character produced) with the expected character. Use `event.code` only for the finger guide.
- Ignore modifier-only keys, auto-repeat (`event.repeat`) and `Dead` keys. The US-International layout, common in NL, turns ' " ` ~ ^ into dead keys.
- Call `preventDefault()` on Space, Backspace, `'` and `/` so the page doesn't scroll or open the browser's quick-find.
- Backspace does nothing in the game; strokes are final.
- Detect Caps Lock with `getModifierState('CapsLock')` and show a warning.
- On touch-only devices, show a "keyboard needed" message.

## Kid safety & privacy

- No analytics, trackers, ads, accounts or external requests at runtime.
- All text shown to kids comes from reviewed files in `content/`.
- The repo is public, so never commit secrets. `.env` is git-ignored.
- Assets must be CC0 or original work. Exception: fonts may use an open licence (e.g. SIL Open Font License) that allows free use in a non-commercial game; ship the licence file with the font. Record the source and licence of every asset in `CREDITS.md`. No trademarked characters, logos or sprites (e.g. nothing taken from Minecraft).

## Verification

- For engine changes, write unit tests first or alongside the code.
- For visual changes, run Playwright, take screenshots and look at them before calling the work done. Check layout, colours, the active-letter arrows, the wrong-key marks and finger-guide correctness.
- Before opening a PR, `typecheck`, `test` and `build` must all pass.
- At the end of each phase, tick its boxes in PLAN.md.

## Style

- TypeScript strict mode, ES modules, Prettier defaults.
- Small, focused commits with clear messages.
- Target 60 fps. Cap particle counts via `config.ts`.
