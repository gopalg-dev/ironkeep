# Engineering standards

How Ironkeep's code is written. The repo is public, so these rules are the contract for every
contributor, human or agent. `CLAUDE.md` and `AGENTS.md` point here. Where a rule has a tool behind
it, the tool enforces it in `bun run check` and CI.

## Reference implementation

The web app `../workout_plan_v3` is the reference, not a source of inspiration to rewrite. Its pure
logic, types, export and import formats, Biome setup and test cases are ported as they are, from its
**working tree** (it holds fixes newer than its last commit). Only the platform layer is new: SQLite
instead of Mongo, React Native components instead of the DOM.

| Web app (`../workout_plan_v3/src`)                                                                                                                                          | Mobile (`src`)                | How                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`, `lib/library.ts`, `lib/logic/*`, `lib/splits.ts`, `lib/day-blocks.ts`, `lib/seed-plan.ts`, `lib/content.ts`, `lib/format.ts`, `lib/must.ts`, `library.json` | `lib/`, `content/`            | Copied unchanged. A change needed for React Native or the stricter compiler is listed in `decisions.md`                                                                                      |
| Hooks with no browser APIs (`use-session-sets.ts`, `use-now.ts`, ...)                                                                                                       | `features/*/hooks/`, `hooks/` | Copied, imports adjusted                                                                                                                                                                     |
| Components (`components/app/*`) and route layouts                                                                                                                           | `components/`, `features/*/`  | Translated: same structure, props and behaviour; shadcn parts become their react-native-reusables namesakes; DOM elements become React Native primitives; the look follows the design canvas |
| `server/repo.ts`, `server/fns.ts`                                                                                                                                           | `db/`                         | Rewritten on SQLite with the same function names, and the web repo tests ported                                                                                                              |
| Tests (`tests/*.test.ts`)                                                                                                                                                   | beside each file              | Ported from vitest to jest-expo, cases unchanged                                                                                                                                             |

## Toolchain

| Tool       | Version line                       | Notes                                                                                                                                                  |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bun        | 1.4                                | The only package manager. `bun install`, `bun run`, `bunx`, `bun expo install` for anything Expo ships. No npm, no yarn, no pnpm lockfiles in the repo |
| Expo SDK   | 58 (React Native 0.88, React 19.3) | New Architecture, Hermes. Dev builds, not Expo Go                                                                                                      |
| TypeScript | the version Expo 58 pins           | Do not chase `typescript@latest` (7.x native compiler) until Expo supports it                                                                          |
| Biome      | 2.6                                | Lint and format. Replaces ESLint and Prettier. Never run bare Prettier                                                                                 |
| Uniwind    | 1.13                               | Tailwind 4 for React Native. `tw-animate-css` for animations; `tailwindcss-animate` (Tailwind 3) is not used, though the reusables doctor asks for it  |
| jest-expo  | 58                                 | Unit and repo tests, with Testing Library for React Native                                                                                             |
| Maestro    | current                            | E2E flows on the Android emulator                                                                                                                      |

## The check

```sh
bun run check       # tsc --noEmit && biome ci . --diagnostic-level=info
bun run check:fix   # biome check --write .
bun run test        # jest
```

`check` must end with zero errors, zero warnings and zero infos before any commit, push or PR. CI runs
the same script. Fix what a diagnostic points at, never the diagnostic: no `biome-ignore`, no
`@ts-expect-error`, no `@ts-ignore`, no `!`, no `as any` to quiet one. A suppression is allowed only
when the rule is genuinely wrong for that line, with the reason written on the same line.

## TypeScript

Compiler options on top of `expo/tsconfig.base`:

```jsonc
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedSideEffectImports": true,
  "verbatimModuleSyntax": true,
  "paths": { "@/*": ["./src/*"] }
}
```

These are the web app's flags plus `noImplicitOverride`. `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` were tried first and dropped:
the ported logic and tests (about 7,000 lines written under the web app's config) raised 195 errors
under them, and the port is kept unchanged so fixes can keep flowing from the web app. The same
discipline is kept by hand instead: index into an array only after a length check or through
`must()`, and never assign `undefined` to an optional field.

Rules:
- **No `any`.** Use `unknown` and narrow. Third-party gaps get a typed wrapper in `src/lib/`, not a cast at the call site.
- **No `as` casts** except right after a runtime check that proves the type (a zod parse, a type guard). `as const` is fine.
- **No non-null assertions (`!`).** Check the length, or go through `must()` from `src/lib/must.ts`, which throws with a message.
- **No TypeScript `enum`.** Use `as const` arrays and derive the union: `export const UNITS = ['kg', 'lb'] as const; export type Units = (typeof UNITS)[number]`.
- **Discriminated unions** for anything with states (a workout is `in_progress` or `done`, an import row is `ok` or `skipped` with a reason). Every `switch` over a union ends in an exhaustive `never` check.
- **Validate at the boundaries with zod.** Imported files (JSON backup, CSV, XLSX), JSON columns read from SQLite, and route params are parsed, never trusted. Types are inferred from the schemas (`z.infer`), not written twice.
- **Type-only imports** with `import type` (enforced by `verbatimModuleSyntax` and Biome's `useImportType`).
- **Exported functions declare their return type.** Internal helpers may infer.
- **`readonly`** on data that must not change: plan templates, the library, settings snapshots passed to logic.
- **Pure logic stays pure.** `src/lib/logic/` has no React, no SQLite, no `Date.now()` hidden inside: time comes in as a parameter so tests are deterministic.
- **Errors**: logic returns results or throws typed errors (`class ImportError extends Error`); UI catches at the screen boundary and shows a message that states what happened and what to do.

## Biome

One rule is off for the whole project: `a11y/useGenericFontNames`. It asks for a generic fallback (`sans-serif`) after a font family, which React Native cannot take: a `font-family` is one name, and `src/global.css` names a bundled font file per weight.

`biome.json` (abridged):

```jsonc
{
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": {
    "rules": { "recommended": true },
    "domains": { "react": "all", "reactNative": "all", "test": "recommended" }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

Rules that matter most here:
- `reactNative/noReactNativeLiteralColors`: colours come from tokens (`text-foreground`, `bg-day-push`), never hex in components.
- `reactNative/noReactNativeRawText`: text always inside `<Text>`.
- `reactNative/noReactNativeDeepImports`: no `react-native/Libraries/...`.
- `react/useExhaustiveDependencies`, `react/useHookAtTopLevel`.
- `suspicious/noExplicitAny`, `style/noNonNullAssertion`, `style/useImportType`, `complexity/noForEach` (use `for...of`).
- Formatting matches the web repo: single quotes, no semicolons, 120 columns.

## Project structure

From `research/stack.md` section 2 (Expo's guidance plus feature folders) and the requirements, section 10:

```
src/
  app/            routes only (expo-router). A route file reads params and renders a screen from features/
  features/<x>/   one folder per domain: setup, today, workout, plan, stats, report, library, settings, data
                  holding only what it needs: screens/, components/, hooks/, queries.ts (Drizzle), index.ts
  components/ui/  react-native-reusables components, as published. Never edited; adjust through props, then className
  components/     shared app components (day-tile, number-stepper, icon-button, empty-state)
  theme/          themes.ts (registry: name, label, light or dark), nav-theme.ts, use-theme-scheme.ts, fonts.ts
  lib/            pure logic and types copied from the web app, plus small utilities (utils.ts: cn)
  db/             schema.ts, client.ts, migrate.ts, repository functions
  hooks/          shared hooks used by two or more features (use-stopwatch, use-keep-awake)
  stores/         zustand stores for transient UI state only
  content/        splits, day blocks, library json, guide text
  global.css      Tailwind v4 + Uniwind imports and every colour token, one @variant per theme
drizzle/          generated migrations (committed)
.maestro/         e2e flows
assets/           fonts, icon, splash, library pictures
```

- Imports flow `lib` / `theme` -> `db` -> `components` -> `features` -> `app`. Never feature to feature; shared pieces move down to `components/` or `lib/`.
- No barrel files except a feature's own `index.ts`.
- Files are kebab-case (`day-tile.tsx`), components PascalCase, hooks `useThing`, constants `SCREAMING_CASE`.
- One component per file. A file over about 250 lines is a signal to split by concern.

## React Native

- **Library first.** A new piece of UI starts from react-native-reusables, then `@expo/ui` / Expo modules, then a custom component only when nothing fits.
- **Colours live only in `src/global.css`.** No hex, rgb, hsl or oklch literal in any `.ts` or `.tsx` file; `scripts/check-colors.ts` fails `bun run check` if one appears. A colour needed as a value is read with Uniwind's `useCSSVariable('--color-…')`; a colour prop on a third-party component (SVG stroke, icon colour) gets a class through `withUniwind` and the `accent-` prefix. Details: `research/theming.md`.
- **Themes are open-ended.** Each theme is an `@variant` block in `global.css`, a name in `extraThemes`, and an entry in `src/theme/themes.ts` with its scheme. Anything that depends on light or dark (status bar, system bars, navigation base) reads the scheme from the registry, never the theme's name.
- **Weights pick the font file.** The five weights are five font files, each its own family; `font-normal` to `font-extrabold` name the file (`src/global.css`) and every `--font-weight-*` token is 400, because React Native 0.88 on Android renders the wrong face from a multi-weight XML family and falls back to Roboto when it looks for a synthetic bold. Never write `font-sans` on a text: it names the Regular file and wins over the weight class; the root layout's text context is `font-normal`.
- **A line height is never tighter than the font's line box** (1.2 em for Barlow and Barlow Condensed, read from the fonts' hhea tables). Android clips each line at its box, so a tighter line cuts descenders; the title is `leading-11.5` (46 px at 36 px), body `leading-6`.
- **Numbers are typographic roles, app-wide.** Every number is set in tabular figures (`NUMBER` from `src/components/typography.ts` on top of its text role), hero and mid numbers use `BIG_NUMBER` / `MID_NUMBER` (tracking-tight, never tighter), row values `ROW_VALUE`. No screen styles a number on its own.
- **Tailwind classes first.** `className` through Uniwind for every style. A `style` prop only when a component cannot take `className`, with a one-line comment saying why. No `StyleSheet.create` for things a class can express.
- **Props before className** when adjusting a reusables component (`variant`, `size`), as on the web.
- **Third-party components take `className` only through `withUniwind`.** Uniwind wires its own React Native components; on anything else `className` is silently dropped. The wrapper lives once in `src/components/` (`safe-area.tsx` for react-native-safe-area-context's SafeAreaView) and screens import it from there. A dropped `flex-1` on a screen root collapses every Text under it to zero height on Fabric: that was the first scaffold's invisible text.
- **Lists** use `FlatList` with a stable `keyExtractor`; list items are memoised only when a profile shows it matters.
- **State**: SQLite is the source of truth, read with Drizzle `useLiveQuery`. Zustand only for transient UI state (an open sheet, the Zen cursor). No duplicated data in stores.
- **Accessibility**: every icon-only button has `accessibilityLabel` and `accessibilityRole="button"`; touch targets 44pt minimum (use `hitSlop` when the visual is smaller); text scales with the system font size without clipping.
- **Battery and size** (requirements 8b): no background work, no network, no animation that runs on its own, timers tick only while visible, no native module that is not needed.

## Native code

- A native need is met by a local Expo module under `modules/<name>/` (Expo Modules API, Kotlin), autolinked by its `expo-module.config.json`, never by a third-party package when the need is a few lines: `modules/system-colors` reads Android's Material You palettes. A new or changed module needs `expo prebuild` and a native build; a reload does not pick it up.

## Data safety in code

- Every write that touches more than one row runs in a transaction: `withTransaction` in `src/db/handle.ts` wraps it in expo-sqlite's `withTransactionAsync` on the phone and runs it plain in the tests, whose proxy driver has none.
- Schema changes are Drizzle migrations, generated with `bunx drizzle-kit generate` and committed. Never edit a shipped migration.
- Logging a set is idempotent: the button disables until the write commits.
- Import and export round-trip tests exist for every format before the format ships: `src/db/backup.test.ts` for the envelope, `src/lib/logic/import.test.ts` for the Log and Tracker layouts, the weigh-ins, the tape and the web app's `everything.json`.
- Files go through expo-file-system's `File` and `Directory` (`src/features/data/files.ts`): snapshots in the app's documents under `backups/`, shares written to the cache first, the backup folder a SAF directory picked once.

## Tests

- Tests sit next to the file they test (`progression.ts` and `progression.test.ts`), as Expo recommends; there is no top-level `tests/` folder. Maestro flows live in `.maestro/`.
- Pure logic: every function in `src/lib/logic/` has a test, ported from the web repo where one exists.
- Repository: tests run against an in-memory SQLite.
- Components: Testing Library for behaviour, never snapshots of markup.
- E2E: one Maestro flow per user journey in the requirements, plus the upgrade test.

## CI and EAS builds

- `.github/workflows/ci.yml` runs `bun run check` and `bun run test --runInBand` on pull requests to `main` and pushes to `main`, using the Node.js and Bun versions in `eas.json`.
- `.eas/workflows/android-main.yml` is manual-only. `.github/workflows/eas-after-ci.yml` waits for the GitHub `CI` workflow to succeed on `main`, then runs EAS for that exact commit with `--wait`; the GitHub job passes only when the EAS build workflow succeeds. A failed check or test never starts an EAS build.
- Add an Expo access token as the repository Actions secret `EXPO_TOKEN` (Settings → Secrets and variables → Actions). Use a scoped robot-user token when available. Expo's [programmatic access guide](https://docs.expo.dev/accounts/programmatic-access/) covers token creation and EAS CLI authentication.
- Test names read as sentences: `it('carries last session's weight into an empty set')`.

## Git

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), one concern per commit.
- Commit only when asked; the maintainer pushes.
- `bun run check` and `bun run test` green before every commit.

## Matching a screen to the canvas

The canvas holds exact values for everything (`docs/design/canvas-source/ik.css` and the boards).
Build from the values, not the picture:
1. List the canvas rules the screen uses and map each to its scale class from the tokens (radii:
   `rounded-sm` 10, `-md` 12, `-lg` 14, `-xl` 16, `-2xl` 24; type on the built-in scale; spacing
   `p-4` = 16). Never a px literal.
2. Capture the phone in light mode with Android's Bold text off and measure against the design PNG
   in dp: ink widths, descender depth, box heights, radii. A composite is for a last look only.
3. When the phone cannot do what the canvas says (a line box, a touch pitch), change the canvas in
   the same step and say why in `docs/decisions.md`.

## Sheets and dialogs

A bottom sheet is a route presented by the root stack as a form sheet (`presentation: 'formSheet'`,
`sheetAllowedDetents: 'fitToContents'`): Android draws its own bottom sheet, sized to the content,
closed by a drag or the back key, with no animation library. The route's body is wrapped in
`SheetBody` (grab bar, gutters). A sheet with more than fits (the exercise drawer, the session editor,
the past-day log) is registered with one fixed height instead (`tallSheet` in the root layout, nine
tenths of the screen) and wraps its body in `SheetScroll`, which scrolls inside the sheet. One snap
height only: with two, Android collapsed the sheet on a pull down at the top while the scrolled content
kept its taller layout, and the handle and header were cut off the top. A dialog is
the `Dialog` component: a native `Modal` with the platform's fade. Never a sheet or dialog animated in
JavaScript.

A list reordered by drag (`SortableRows`) lays its rows out by hand: each row measures its height and
sits at an absolute offset held by one Animated value that stays attached to it. Rows glide to the slots
of the live order; the dropped order changes nothing on screen. Never reset a transform from an animated
value to a plain number on the new architecture: the view keeps the animated value and sticks.

## The page bar

One rule for every screen with buttons at the top (from the obp-mobile-v2 page-bar rule, 19 Oct
2026, and Nielsen Norman Group on sticky headers): the page's round buttons never scroll away. A
slim opaque bar fades in behind them as soon as text would slide under them, and the page's name
joins it as the big title slides under the bar, as an iOS large title collapses. It stays while
reading: no hide on scroll down, no pop-in on scroll up. `Screen` takes `bar={{ title, left, right }}`
and the screen's big title reports its place with `useBigTitle` (its `onLayout`). The bar runs on
React Native's own `Animated` with the native driver: no animation library, nothing per frame in JS.

## Accessibility

- Every icon-only button has an `accessibilityLabel`; a row that reads as one thing (a lift and its
  target) is `accessible` with a spoken label in words, not signs.
- Pictures that only decorate (thumbnails, day tiles) carry no label.
- Touch targets: 44 dp, or a smaller control with `hitSlop` to 48.
- Text reflows at Android's font scale up to 2.0: rows wrap to two lines, button rows wrap, nothing
  is cut; check with `adb shell settings put system font_scale 2.0`.
- Contrast: text on its surface at 4.5:1 or better in both themes (`muted-foreground` is tuned to
  pass on the secondary surface; the day buttons keep the design's white ink, a known 3.4:1 in the dark theme). The audit is the
  contrast script in `docs/decisions.md` (2026-10-21).
