# Ironkeep

An offline gym logbook for Android (iOS later), built with Expo. No accounts, no server, no network.
Start every session with `CHECKLIST.md`; the plan and its reasons live in `docs/`.

Rules that need more than a few lines keep their detail in `docs/`, named here as plain paths so they
are read only when the rule applies. Never `@`-import them.

## What the app does

The app shows: stats, reports, the plan, and the numbers from earlier sessions. It never pushes the
user toward a decision and never prescribes: no rest timer that counts down, no "aim for", no "do
this", no streak guilt, no "sessions left". Every decision and customisation is the user's.

No explanatory copy: no page subtitles, no "tap X to" hints. Only data, controls, and warnings that
state a consequence. The Guide is the one screen allowed to explain.

The user's data is sacred: every multi-row write is a transaction, destructive actions ask for a
typed phrase, export is one tap away, updates never touch the data. Details: `docs/00-requirements.md`
section 6.

Battery and size are hard limits: no background work, no network, no self-running animation, small
APK. Targets: `docs/00-requirements.md` section 8b.

## Code

- bun is the only package manager. `bun expo install` for anything Expo ships.
- TypeScript strict, no `any`, no `!`, no unchecked casts, zod at every boundary. Biome lints and formats.
- Components: react-native-reusables first, then Expo modules, custom only when nothing fits.
  `src/components/ui` stays as published; adjust with props, then `className`.
- Styling: Tailwind classes through Uniwind. A `style` prop only when a component cannot take
  `className`, with the reason on the same line.
- Tidy code: extract logic you are about to write twice; data, state and UI in separate modules; a
  change removes what it leaves unused.

Don't reinvent: the web app in `../workout_plan_v3` is the reference. Port its logic, data shapes,
config and fixes from its working tree (it holds uncommitted fixes newer than its last commit).

Full standards, structure and examples: `docs/engineering.md`.

## Design stays in sync

The design canvas is the source of truth for the look:
https://claude.ai/artifact/JjZZTUxBdyqfhz1ravLCLQ. Any UI change in code updates the matching artboard
in `docs/design/canvas-source/`, republishes the canvas and refreshes `docs/design/screens/` in the
same step. Colour tokens live only in `src/global.css`; after changing one, run `bun run design:tokens`
to regenerate the canvas's colour board. Tokens and components: `docs/02-design-brief.md`.

## Before you finish

```sh
bun run check   # Expo Doctor + TypeScript + Biome + colour/contrast checks
bun run test
```

Zero errors, warnings and infos. Fix what a diagnostic points at, never the diagnostic. No
`biome-ignore`, `@ts-expect-error`, `!` or `as any` to quiet one.

Any UI change is checked on the emulator at 360 and 412 widths, light and dark, then the Maestro
flows, before it is called done. Tick the item in `CHECKLIST.md` only when it is verified.

Commit only when asked. Never push.
