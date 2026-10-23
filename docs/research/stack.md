# Expo / React Native stack research for the Plates Android port

Researched 2026-10-21. Every version number below was read from the npm registry, the GitHub API, or the linked primary page on that date.

## Recommendations (one line per decision)

1. **SDK:** Expo SDK 58 (released 2026-10-15; React Native 0.88, React 19.3.0, Node >= 22.13). Scaffold with `bun create expo --template default@sdk-58` and use development builds, not Expo Go. Fallback if a dependency is not on RN 0.88 yet: SDK 57 (RN 0.86).
2. **Navigation:** `expo-router` (Expo's stated recommendation; no React Navigation dependency since SDK 56; native tabs stable in 58). Routes live in `src/app/` and contain nothing but routes.
3. **Structure:** `src/` with `app/` (routes only), `features/<domain>/` (plan, session, stats, report, targets, settings), `components/ui/` (copied rnr components), `components/` (shared), `db/`, `lib/`, `hooks/`, `stores/`; tests colocated; `.maestro/` for e2e; `docs/`. Enforce feature -> shared, never feature -> feature.
4. **Component kit:** react-native-reusables (rnr) — the only shadcn-model port (same names, `npx @react-native-reusables/cli@latest init|add`, copy-into-repo, CSS-variable themes, lucide icons). 32 components, MIT, last push 2026-09-27.
5. **Styling engine:** Uniwind 1.13.0 (MIT, Tailwind v4, no Babel preset) via rnr's `minimal-uniwind` template / `--styling-library uniwind`. Reason: NativeWind v5 (Tailwind v4) is still an RC marked "not for production", NativeWind v4 is Tailwind v3. Fallback: NativeWind 4.2.7 if Uniwind misbehaves.
6. **Icons:** `lucide-react-native` through rnr's `Icon` wrapper (`<Icon as={X} className="text-muted-foreground" size={16} />`). Skip `@expo/vector-icons` (deprecated in SDK 56).
7. **Fonts:** `@expo-google-fonts/barlow` + `@expo-google-fonts/barlow-condensed` (0.4.1), embedded with the `expo-font` config plugin; `fontVariant: ['tabular-nums']` on numeric text (verify Barlow's `tnum` on a device).
8. **Charts:** `victory-native` 43.x (Skia; `CartesianChart` + `useChartPressState` for tap/scrub, `formatXLabel` on numeric timestamps). Pin `react-native-skia@2.15.x` (Skia 3 unsupported). Alternative for sparklines without axes: `react-native-graph`.
9. **Data layer:** `expo-sqlite` + `drizzle-orm` (`useLiveQuery` for reads, plain Drizzle for writes, bundled SQL migrations). Zustand only for transient UI state. No TanStack Query: there is no server state.
10. **Tooling:** TypeScript `strict`, `@/*` -> `src/*` via tsconfig `paths` (no Babel needed); Biome 2.6 with `react`, `reactNative`, `test` domains (keeps parity with the web repo); `bun` as package manager (EAS detects `bun.lock`); `expo-doctor` + `tsc --noEmit` + `biome ci` in CI.
11. **Testing:** `jest-expo` 58 (Jest 30) + `@testing-library/react-native` 14 for units; Maestro for e2e (Expo's pick, EAS `type: maestro` job, `takeScreenshot`/`assertScreenshot` for per-screen visual checks); GitHub Actions with `reactivecircus/android-emulator-runner` + KVM on `ubuntu-latest`.
12. **Build:** `eas.json` profile `preview` with `android.buildType: "apk"` -> `eas build -p android --profile preview`. No-account path: `npx expo prebuild` then `cd android && ./gradlew assembleRelease` (works on Windows; `eas build --local` does not).
13. **Icon/splash:** 1024x1024 PNG icon, `android.adaptiveIcon` (foreground + monochrome + backgroundColor), `expo-splash-screen` plugin with `dark` variant.
14. **OSS hygiene:** MIT `LICENSE`, README (what/why/screens/stack/run/test/build/contribute), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`/`CLAUDE.md`, pinned-SHA workflows with `permissions: contents: read` (lint + typecheck + unit on PR, e2e nightly), Conventional Commits + release-please for CHANGELOG.

---

## 1. Expo SDK, React Native, architecture, router, template

| SDK | Released   | React Native | React  | Min Node | Notes                                                |
| --- | ---------- | ------------ | ------ | -------- | ---------------------------------------------------- |
| 58  | 2026-10-15 | 0.88         | 19.3.0 | 22.13.x  | current `latest` on npm (`expo@58.0.16`, 2026-10-19) |
| 57  | 2026-06-30 | 0.86         | 19.2.3 | 22.13.x  | "no breaking changes" minor-style release            |
| 56  | 2026-05-21 | 0.85         | 19.2   | 20.19.4  | Hermes V1 default; router dropped React Navigation   |
| 55  | 2026-02-25 | 0.83         | —      | —        | Legacy Architecture removed                          |

Sources: https://docs.expo.dev/versions/v58.0.0/ (version table), https://expo.dev/changelog/sdk-58, https://expo.dev/changelog/sdk-57, https://expo.dev/changelog/sdk-56, https://expo.dev/changelog/sdk-55, npm registry `expo` dist-tags.

**New Architecture:** mandatory. React Native 0.82 (Oct 2025) made the New Architecture the only runtime; SDK 55 removed the `newArchEnabled` option ("you will not be able to use the Legacy Architecture in SDK 55 projects and later"). Hermes V1 is default since SDK 56 (opt out via `useHermesV1` in `expo-build-properties`). Sources: https://reactnative.dev/blog/2026/02/11/react-native-0.84, https://expo.dev/changelog/sdk-55, https://expo.dev/changelog/sdk-56.

**expo-router:** Expo's docs say "if you are building a new app, we recommend using Expo Router". Since SDK 56 it no longer depends on React Navigation (import from `expo-router/react-navigation` instead of `@react-navigation/*`; codemod `npx expo-codemod sdk-56-expo-router-react-navigation-replace`). SDK 58: native tabs, toolbars, data loaders, SSR and middleware are stable; navigation core reworked; `withLayoutContext` deprecated for `integrateWithRouter`. Current npm: `expo-router@58.0.24`. Sources: https://docs.expo.dev/router/introduction/, https://expo.dev/changelog/sdk-56, https://expo.dev/changelog/sdk-58.

**Template:** `default` = Expo Router + TypeScript, generates `AGENTS.md` (and `.claude/settings.json` when Claude Code is installed; `--no-agents-md` to skip); since SDK 56 the template also includes `@expo/ui`. During the SDK 58 transition `npx create-expo-app@latest` without `--template` still creates an **SDK 57** project; use `--template default@sdk-58` (bun: `bun create expo --template default@sdk-58`). Expo Go for SDK 58 was "a few weeks" away on 2026-10-15 and will support only SDK 58. Sources: https://docs.expo.dev/more/create-expo/, https://expo.dev/changelog/sdk-58, https://expo.dev/changelog/sdk-56.

**Breaking / gotchas for a late-2026 fresh project:**
- RN 0.87/0.88 Strict TypeScript API by default: deep imports from `react-native/Libraries/*` are type errors; `InteractionManager`, root `Touchable` export, several `Modal`/`StatusBar` props removed; `ImageBackground` deprecated (SDK 58 changelog).
- SDK 56 bumped TypeScript to 6.0.3; `expo/fetch` is now `globalThis.fetch` (opt out `EXPO_PUBLIC_USE_RN_FETCH=1`); `expo-file-system` `copy()/move()` async, SDK 58 `File.write()` async.
- SDK 58 Android: R8 enabled by default in release builds (watch for ProGuard-sensitive libs); iOS: scene-based lifecycle, `SceneDelegate.swift` generated; `NODE_ENV` now set per command (changes which `.env` files load); `expo-sqlite` dropped libSQL.
- `@expo/vector-icons` deprecated in favour of `@react-native-vector-icons/*` (SDK 56); `expo` no longer depends on it.
- Known SDK 56 regressions (worklets/reanimated memory, slow dev startup) were fixed in SDK 57.0.9/57.0.17.
- Odd Node majors (23, 25) unsupported; use Node 22 or 24.
- Third-party readiness on RN 0.88: NativeWind v5 RC is tested on Expo 57.0.22/RN 0.86.3; Uniwind has an official `create-expo-app -e with-router-uniwind` example; victory-native 43 was released 2026-10-20. Nothing explicitly claims 0.88 yet, so budget one day to validate on SDK 58 and fall back to 57 if a library breaks.

**Captured from the `expo:expo-overview` skill:** detect the SDK from `package.json` and read version-pinned docs (`/versions/v58.0.0/`), install with `npx expo install <pkg>`, prefer `@expo/ui` components (SDK 56+, SwiftUI/Compose) for sheets, pickers, switches, menus and grouped lists; `@expo/ui` `List` is not virtualized. The `expo:expo-router` skill adds: kebab-case file names, never co-locate non-route files in `app/`, stacks defined in `_layout.tsx`, `NativeTabs` from `expo-router/unstable-native-tabs`, `headerLargeTitleEnabled` (SDK 56+ name), `Stack.Screen options={{ presentation: 'formSheet' }}` for sheets, `Color` from `expo-router` for semantic colours.

## 2. Project structure

**Expo's official recommendation** (Kadi Kraman, 2025-09-23, updated 2026-01-07; mirrored by the `expo:expo-project-structure` skill):

```
assets/
scripts/
src/
  app/            # routes ONLY (every file is a route); app/api/ for +api routes
  components/     # reusable UI; folder + index.tsx when it grows; .web/.ios/.android variants
  screens/        # screen bodies rendered by thin route files; private parts colocated
  server/         # server-only helpers for API routes
  utils/          # helpers + colocated *.test.ts
  hooks/
  constants.ts
  theme.ts
app.json  eas.json  package.json  AGENTS.md  CLAUDE.md
```
Rules: `src/` keeps code apart from config; `@/*` -> `./src/*`; kebab-case files; styles at the bottom of the component file; tests next to the file; platform splits via file extensions with a default file always present. Source: https://expo.dev/blog/expo-app-folder-structure-best-practices, https://docs.expo.dev/router/reference/src-directory/.

**Obytes starter (current `master` tree, GitHub API):** `src/app/` (routes), `src/components/ui/`, `src/features/{auth,feed,onboarding,settings}/`, `src/lib/{api,auth,hooks,i18n,storage.tsx,utils.ts,test-utils.tsx}`, `src/translations/`, `src/global.css`. (Its handbook page at https://handbook.obytes.com/docs/mobile/project-structure is stale and still shows React Navigation folders.) Source: https://github.com/obytes/react-native-template-obytes.

**bulletproof-react:** `src/{app,assets,components,config,features,hooks,lib,stores,testing,types,utils}`; a feature holds only the sub-folders it needs (`api, assets, components, hooks, stores, types, utils`); features never import each other, imports flow shared -> features -> app, enforced with `import/no-restricted-paths`. Source: https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md.

**Bluesky social-app `src/`:** `alf/` (design system), `components/`, `features/`, `lib/`, `screens/`, `state/`, `storage/`, `view/`, `locale/`, `logger/`, `platform/`, `routes.ts`, `style.css` — a hybrid as well. Source: GitHub API listing of https://github.com/bluesky-social/social-app/tree/main/src.

**Callstack's "Ultimate guide"** could not be located with two searches; nothing from callstack.com surfaced on folder structure, so it is not cited.

**Recommended layout (hybrid: Expo's rules + feature folders):**

```
.
├── .maestro/                 # e2e flows (home.yml, session.yml, ...)
├── .github/workflows/        # ci.yml (lint, typecheck, unit), e2e.yml (nightly), release.yml
├── assets/                   # icon.png, adaptive-icon*.png, splash-icon*.png, fonts/
├── docs/                     # ADRs, architecture.md, screens.md (screenshots), agents/
├── drizzle/                  # generated SQL migrations + migrations.js (committed)
├── scripts/
├── src/
│   ├── app/                  # Expo Router routes only (thin: read params, render a feature screen)
│   │   ├── _layout.tsx       # providers: SQLite/Drizzle migrations, fonts, theme, PortalHost
│   │   ├── (tabs)/_layout.tsx, index.tsx, plan.tsx, stats.tsx, report.tsx, settings.tsx
│   │   └── session/[id].tsx
│   ├── features/             # one folder per domain; may import from shared layers only
│   │   ├── plan/             #   components/, hooks/, queries.ts, screens/, plan.test.ts
│   │   ├── session/
│   │   ├── stats/
│   │   ├── report/
│   │   ├── targets/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/               # rnr copies (button.tsx, card.tsx, ...): never edit in place beyond theming
│   │   └── ...               # shared app components (empty-state.tsx, stat-tile.tsx, line-chart.tsx)
│   ├── db/                   # schema.ts, client.ts (openDatabaseSync + drizzle), migrate.ts, seed.ts
│   ├── lib/                  # pure logic ported from the web app: progression.ts, format.ts, dates.ts
│   ├── hooks/                # shared hooks (use-color-scheme.ts, use-app-state.ts)
│   ├── stores/               # zustand stores for transient UI state only
│   ├── theme/                # fonts.ts, nav-theme.ts; colour tokens live in global.css
│   └── global.css            # Tailwind v4 + Uniwind imports, :root/.dark CSS variables
├── app.json / app.config.ts  eas.json  biome.json  tsconfig.json  metro.config.js
└── README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md AGENTS.md CLAUDE.md
```

Why this over pure type-based: the app already has six clear domains and shared logic (`src/lib/logic/progression.ts`, `format.ts`) that is being ported verbatim; feature folders keep each screen's components, hooks and queries together while `app/` stays routes-only as Expo requires. Why not pure feature-based: rnr's copy-in components and Drizzle's schema are genuinely shared and belong in one place. Enforce the import direction with Biome's `noRestrictedImports` (or an ESLint `import/no-restricted-paths` zone if ESLint is chosen).

**Captured from the `expo:expo-design-system` skill:** one token source of truth (`src/theme/` or, for Tailwind projects, CSS variables in `global.css`); components import tokens, screens import components; promote a view to `components/` only when it is used on two screens and has a nameable role; shadows as `boxShadow` strings; avoid "native slop" (web modals, everything-is-a-card, emoji icons).

## 3. shadcn-style component kits

|                    | react-native-reusables                                                                                                                                                                                                                                                                                                                                      | gluestack-ui v5                                                                                              | HeroUI Native                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Model              | copy into repo via `npx @react-native-reusables/cli@latest init\|add` (uses the shadcn CLI underneath); primitives from `@rn-primitives/*`                                                                                                                                                                                                                  | copy into repo via `npx gluestack-ui@latest init\|add`, still depends on headless `@gluestack-ui/*` packages | npm package `heroui-native` (not copy-in)                                        |
| Styling            | NativeWind v4 **or** Uniwind (`--styling-library`, `minimal-uniwind` template; separate registries `r/nativewind`, `r/uniwind`)                                                                                                                                                                                                                             | NativeWind v5 (Tailwind v4) or Uniwind (Expo-only)                                                           | Uniwind (Tailwind v4)                                                            |
| Theme / dark mode  | shadcn CSS variables (`:root` / `.dark:root`, `--background`, `--primary`, ...), `darkMode: 'class'`, `NAV_THEME` for the router                                                                                                                                                                                                                            | `GluestackUIProvider` mode                                                                                   | own theme provider                                                               |
| Components         | 32: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, button, card, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, icon, input, label, menubar, native-only-animated-view, popover, progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea, toggle, toggle-group, tooltip; plus auth "blocks" | ~47 incl. Actionsheet, BottomSheet (alpha), Drawer, Toast, Slider, Table (alpha), Tabs (alpha), Grid (alpha) | 43 incl. bottom-sheet, chip, input-otp, slider, toast, scroll-shadow, glass-view |
| Version / activity | CLI 0.7.1 (2026-03-14); repo pushed 2026-09-27 (new docs, catalogs.dev); 8.7k stars; 17 open issues; MIT                                                                                                                                                                                                                                                    | 5.0.3 (2026-06-25); 5.3k stars; pushed 2026-09-02; MIT                                                       | 1.0.11 (2026-10-20); 3.7k stars; pushed 2026-10-20; Apache-2.0                   |
| Closest to shadcn  | **yes**: same names, same `cva`/`cn` pattern, same CSS variable names, `Text` inside `Button`                                                                                                                                                                                                                                                               | partly                                                                                                       | no                                                                               |

Known rnr limitations (open issues): `select` width uses a web-only Radix variable (#534), AlertDialog crash report (#520), portal-dependent components mis-open in some setups (#463), orientation change layout (#545), `placeholderClassName` typing (#544), NativeWind v5 needs component tweaks (`styled()` instead of `cssInterop` for `Icon`, Android `TextInput` descender clipping) documented in #548. Web still works via react-native-web. Sources: https://github.com/founded-labs/react-native-reusables (README, `apps/docs/content/docs/cli.mdx`, `installation/manual.mdx`, `catalogs/items/icon/icon.md`, issues), https://reactnativereusables.com/docs, https://gluestack.io/ui/docs/home/getting-started/installation, https://github.com/heroui-inc/heroui-native, https://gist.github.com/CarlosZiegler/5f9ea468ee3906d466b496af35d68aff (component matrix).

**Recommendation: rnr.** It is the only kit that keeps the shadcn mental model your web code already uses (component names, variants, `cn()`, CSS variables), so the port is mostly mechanical. Missing pieces (bottom sheet, toast, slider) come from `@expo/ui` (`BottomSheet`, `Slider`, `Switch`) per the `expo:expo-ui` skill or `@rn-primitives`.

## 4. NativeWind (and Uniwind)

**Versions (npm, 2026-10-21):** `nativewind@4.2.7` = `latest` (2026-09-14, Tailwind **v3** `^3.4.17`, `react-native-css-interop@0.2.7`); `nativewind@5.0.0-rc.0` (2026-09-13, Tailwind **v4**, `react-native-css@3.1.0-rc.0`), docs banner: "pre-release ... not intended for production use"; "stable promotion follows RC user feedback". `uniwind@1.13.0` (2026-10-19, MIT, Tailwind v4 only). Sources: https://www.nativewind.dev/v5, https://github.com/nativewind/nativewind/releases, npm registry.

**NativeWind v4 Expo setup** (https://www.nativewind.dev/docs/getting-started/installation): `npm i nativewind@4.2.7 react-native-reanimated react-native-safe-area-context` + `-D tailwindcss@^3.4.17 prettier-plugin-tailwindcss babel-preset-expo`; `tailwind.config.js` with `content` globs and `presets: [require('nativewind/preset')]`; `global.css` with the three `@tailwind` directives; `babel.config.js` presets `[['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel']`; `metro.config.js` `withNativeWind(config, { input: './global.css' })` (rnr adds `inlineRem: 16`); `import './global.css'` in the root layout; `nativewind-env.d.ts` with `/// <reference types="nativewind/types" />`; `app.json` `web.bundler: "metro"`. SDK 57 needs `react-native-worklets` alongside Reanimated 4.

**NativeWind v5 RC Expo setup** (https://www.nativewind.dev/v5/getting-started/installation): exact pins `nativewind@5.0.0-rc.0 react-native-css@3.1.0-rc.0`, `tailwindcss@4.1.12 @tailwindcss/postcss@4.1.12 postcss lightningcss@1.30.1` plus `"overrides": { "lightningcss": "1.30.1" }`; `postcss.config.mjs`; `global.css` imports `tailwindcss/theme.css layer(theme)`, `tailwindcss/preflight.css layer(base)`, `tailwindcss/utilities.css` (unlayered) and `nativewind/theme`; metro `withNativewind` from `nativewind/metro`; remove the v4 Babel preset/jsxImportSource; `nativewind-env.d.ts` references `react-native-css/types`; `userInterfaceStyle: "automatic"`. Tested target: Expo 57.0.22 / RN 0.86.3.

**Dark mode / variables (v5 docs, same ideas in v4):** `dark:` maps to `prefers-color-scheme`; manual override via RN `Appearance.setColorScheme('dark'|'light'|'unspecified')`; read with RN `useColorScheme` (the nativewind hook is deprecated in v5); qualified selectors like `:root.dark` are rejected by the native compiler (use media queries or `vars()`); always pair light and dark classes. Themes = CSS variables consumed via `vars()`. Source: https://www.nativewind.dev/v5/core-concepts/dark-mode.

**What accepts `className`:** core RN components get it through Metro import rewrites (v5) / the Babel JSX transform (v4). Third-party components that only take `style` need `styled(Component, { className: 'style' })` (v5) or `cssInterop` (v4); style values can be lifted to props with `nativeStyleMapping` (v5) / `nativeStyleToProp` (v4), e.g. `color` for SVG icons. Props like `indicatorClassName` are not automatic. Source: https://www.nativewind.dev/v5/guides/third-party-components.

**Still needs `style`/StyleSheet:** shadows (`shadow-sm..2xl` listed, platform behaviour "evaluated separately"; the most-commented open v4 issue #1711 is a shadow-toggle crash in Expo Router); `rtl/ltr` (#1433); `animate-*` on cssInterop parents (#1117); colour opacity modifiers returning undefined (#1870, 2026-09-24); Android `font-bold` via className clipping text (#1846); `tint-*` broken on main (#1837); styles missing in EAS builds (#1372); Jest + RNTL configuration (#1398). Source: https://github.com/nativewind/nativewind/issues.

**Uniwind** (https://docs.uniwind.dev/quickstart, https://uniwind.dev/vs-nativewind): `bun add uniwind tailwindcss`; `global.css` = `@import 'tailwindcss'; @import 'uniwind';`; metro `withUniwindConfig(config, { cssEntryFile: './src/global.css', dtsFile: './src/uniwind-types.d.ts' })` as the outermost wrapper; no Babel preset; generated typings; import the CSS in the root component (not `index`). Free tier is MIT and runs in Expo Go; Pro (paid, native code) adds a C++ engine, zero re-render theme switches and Reanimated integration. Vendor benchmark (iOS, 2,003 views): StyleSheet 37 ms, Uniwind 61 ms, NativeWind 4 138 ms, NativeWind 5 RC 323 ms. Used by HeroUI Native and gluestack v5; `create-expo-app -e with-router-uniwind` exists.

**Decision:** Uniwind free tier with rnr's uniwind registry: Tailwind v4 parity with the web repo's `global.css`, no RC, no Babel transform. Keep NativeWind 4.2.7 as the escape hatch (rnr supports both; switching is a `--styling-library` flag plus re-adding components).

## 5. Icons

- `lucide-react-native@1.61.0` (2026-10-21, ISC, peer `react-native-svg` 12-15). Icons take `color`/`size`, not `className`; rnr's `Icon` (`components/ui/icon.tsx`) maps `className` -> colour/size once and inherits `TextClassContext`, so `<Icon as={ArrowRight} className="text-red-500" size={16} />` works inside buttons. Under NativeWind v5 the wrapper must use `styled()` from `react-native-css` instead of `cssInterop` (rnr #548); the Uniwind registry has its own `icon.json`. Sources: npm registry, https://lucide.dev/guide/react-native, rnr `catalogs/items/icon/icon.md`.
- `@expo/vector-icons@15.1.1` (2026-02-23) is **deprecated** as of SDK 56 in favour of `@react-native-vector-icons/*` (14.0.0, 2026-10-19); `expo` no longer depends on it. Source: https://expo.dev/changelog/sdk-56.
- Native alternatives from the Expo skills: SF Symbols via `expo-symbols` (iOS, optional peer in SDK 58) and Material icons through `@expo/ui`/`NativeTabs.Trigger.Icon sf= md=`.

**Recommendation:** lucide via rnr `Icon` for in-app icons (same set as the web app); native tab icons through `NativeTabs.Trigger.Icon`.

## 6. Fonts

- `@expo-google-fonts/barlow@0.4.1` (2025-09-12) and `@expo-google-fonts/barlow-condensed@0.4.1` (2025-09-09): 18 static styles each (100..900 + italics), subpath imports such as `@expo-google-fonts/barlow/600SemiBold`. Sources: npm registry, https://classic.yarnpkg.com/en/package/@expo-google-fonts/barlow.
- Expo recommends the **`expo-font` config plugin** on native (fonts embedded at build time; needs a dev build, not Expo Go): `["expo-font", { "fonts": ["node_modules/@expo-google-fonts/barlow/600SemiBold/Barlow_600SemiBold.ttf", ...] }]`. Android derives the family name from the file name (object syntax lets you declare `fontFamily`); iOS reads it from the file. Expo's advice: name files after the PostScript name (e.g. `Barlow-SemiBold`) so both platforms agree, so copy the TTFs you use into `assets/fonts/` with those names. `useFonts` remains for web. SDK 58 adds variable-font support and RN 0.88's `fontVariationSettings`. Source: https://docs.expo.dev/develop/user-interface/fonts/.
- Because static files carry one weight each, set weight through `fontFamily` (`Barlow-SemiBold`) and omit `fontWeight`, as the `expo:expo-design-system` skill notes (iOS otherwise synthesises or falls back).
- **Tabular numerals:** RN `Text` style `fontVariant: ['tabular-nums']` (also `lining-nums`, `oldstyle-nums`, `proportional-nums`, `small-caps`); the docs give no platform caveats. It only works if the font carries a `tnum` GSUB feature; an old Glyphs thread reports custom fonts where only SF Pro honoured it. Verify Barlow on an Android device early; fallback is Barlow Condensed's narrower digits or a monospace digit font. Sources: https://reactnative.dev/docs/text-style-props, https://forum.glyphsapp.com/t/tabular-figures-in-mobile-app/22733.

## 7. Charts

|              | victory-native (XL)                                                                                                                                                                                                                                 | react-native-gifted-charts                                      | react-native-graph                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Version      | 43.0.1 (2026-10-20); 1.2k stars; pushed 2026-10-20; MIT; "Active" (Nearform)                                                                                                                                                                        | 1.4.81 (2026-10-05); 1.4k stars; 99 open issues; MIT            | 1.4.0 (2026-08-24); 2.6k stars (Margelo); MIT                                                              |
| Renderer     | Skia (`react-native-skia` 2.15.1+, **Skia 3 unsupported**; the unscoped package's `latest` is 3.7.2, so pin `2.15.x`) + Reanimated 4.1.7+ + Worklets 0.7+ + Gesture Handler 2/3; RN 0.79+ New Arch, React 19                                        | `react-native-svg` (+ `expo-linear-gradient`); works in Expo Go | Skia + Reanimated + Gesture Handler                                                                        |
| Date axis    | `xKey` must be number or string; use epoch ms and `xAxis.formatXLabel`/`tickValues`; `domain`, `viewport`, `labelRenderer`                                                                                                                          | string x-labels                                                 | `GraphPoint { date: Date; value }`, no axis ticks (only `TopAxisLabel`/`BottomAxisLabel` render callbacks) |
| Tap on point | `useChartPressState` + `chartPressState` prop: shared values for nearest x and each y, `isActive`; multi-press; `chartPressConfig.pan` + `simultaneousWithExternalGesture` for charts inside a ScrollView; render tooltip with Skia `Circle`/`Text` | `pointerConfig` scrub/tap                                       | `enablePanGesture`, `onPointSelected`, `SelectionDot` (requires `animated`)                                |
| Expo         | `babel-preset-expo` wires the Worklets plugin; needs a dev build (native Skia)                                                                                                                                                                      | Expo Go OK                                                      | dev build                                                                                                  |

Sources: https://github.com/FormidableLabs/victory-native-xl (README, `website/docs/getting-started.mdx`, `cartesian/cartesian-chart.md`, `cartesian/chart-gestures.mdx`), https://github.com/margelo/react-native-graph, npm registry for `react-native-gifted-charts` and `react-native-skia`.

**Recommendation: victory-native.** It is the only one with real axes, a numeric time domain, a documented press API that exposes the nearest point, and active maintenance; Skia is already acceptable because the app needs a dev build for fonts and rnr anyway. Cost: Skia + Reanimated add native size (tens of MB of native libs across ABIs; check the APK split). Use `react-native-graph` only for axis-less sparklines; gifted-charts only if you must stay in Expo Go.

## 8. State / data layer (offline-only, local DB)

- `expo-sqlite@58.0.13`: `openDatabaseSync/Async`, `SQLiteProvider` + `useSQLiteContext`, `db.sql` tagged templates, `addDatabaseChangeListener` (requires `enableChangeListener: true`), SQLCipher/FTS/sqlite-vec via config plugin, libSQL removed in SDK 58, web via wasm. Source: https://docs.expo.dev/versions/latest/sdk/sqlite/.
- `drizzle-orm`: `latest` 0.45.4 (2026-10-08), `rc` 1.0.0-rc.4/5; the Expo guide now installs `drizzle-orm@rc expo-sqlite@next`. `drizzle(openDatabaseSync('plates.db', { enableChangeListener: true }))`; `useLiveQuery(db.select()...)` returns `{ data, error, updatedAt }` and re-runs on change events (added in 0.31.1, modelled on React Query); `drizzle.config.ts` with `dialect: 'sqlite', driver: 'expo'`; migrations bundled with `babel-plugin-inline-import` (`extensions: ['.sql']`) + metro `sourceExts.push('sql')` + `useMigrations(db, migrations)`; `drizzle-studio-expo` dev plugin. Sources: https://orm.drizzle.team/docs/connect-expo-sqlite, https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0311.
- Community pattern (Drizzle discussion #5135, Expo SDK 53): SQLite is the single source of truth, a reactive store only mirrors UI state, never duplicate data. TanStack Query is positioned everywhere as a **server-state** cache (needs `onlineManager`/`focusManager` wiring in RN, MMKV persister for offline cache). Sources: https://github.com/drizzle-team/drizzle-orm/discussions/5135, https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query.
- Expo's `expo-data-fetching` skill (not loaded here) covers React Query for network data; not applicable to an offline-only app.

**Recommendation:** Drizzle `useLiveQuery` for all reads, Drizzle writes in `features/*/queries.ts`, committed SQL migrations run in `app/_layout.tsx` before rendering, `expo-sqlite/kv-store` for small settings, Zustand (`5.0.15`) only for transient UI (active set editor, sheet open state). Skip TanStack Query entirely; add it later only if a sync backend appears. Use `drizzle-orm@0.45.x` stable unless the 1.0 RC is needed for a specific feature.

## 9. Tooling

- **TypeScript:** `tsconfig.json` extends `expo/tsconfig.base`, `"strict": true`, `paths: { "@/*": ["src/*"] }`; Expo CLI reads tsconfig paths itself (`experiments.tsconfigPaths` defaults on), no Babel `module-resolver`. SDK 58 open issue #51748: `"extends": "expo/tsconfig.base"` fails to resolve in some exports-aware tools (tsc/Metro/expo-doctor unaffected). Source: https://docs.expo.dev/guides/typescript/, https://github.com/expo/expo/issues/51748.
- **ESLint (Expo's official path):** `npx expo lint` installs `eslint-config-expo` (58.0.4, 2026-09-29) and writes a flat `eslint.config.js` (`defineConfig([expoConfig, ...])`); Prettier via `eslint-plugin-prettier/recommended`. Expo docs never mention Biome. Source: https://docs.expo.dev/guides/using-eslint/.
- **Biome:** `@biomejs/biome@2.6.0` (2026-10-21) has a **ReactNative domain** (auto-enabled when `react-native >= 0.60` is a dependency): `noReactNativeRawText`, `useReactNativePlatformComponents`, `noReactNativeDeepImports` (recommended) and `noReactNativeLiteralColors`; the React domain (auto with `react >= 16`) carries `useExhaustiveDependencies` (still receiving fixes through 2026). It cannot run `eslint-config-expo`'s Expo-specific rules (env-var checks, import plugin). Bluesky moved to oxlint (`.oxlintrc.json`) rather than Biome. Source: https://biomejs.dev/linter/domains/.
- **Bun:** supported: `bun create expo`, `bun expo install`, `bun run`; EAS picks Bun when `bun.lock` is present (pin with `"bun"` in the build profile); Node LTS still required for `create expo`/`prebuild`; lifecycle scripts need `trustedDependencies`. Source: https://docs.expo.dev/guides/using-bun/.
- **expo-doctor:** `bunx expo-doctor` validates app config, dependency compatibility and project health; run it in CI. Source: https://docs.expo.dev/develop/tools/.

**Recommendation:** Biome (matches the web repo's `bun run check` habit; React + ReactNative + Test domains) + `tsc --noEmit` + `expo-doctor`; document in CONTRIBUTING why not ESLint. If a reviewer insists on Expo's defaults, `eslint-config-expo` flat config is a one-command swap.

## 10. Testing

- **Unit:** `jest-expo@58.0.11` requires **Jest 30**; `@testing-library/react-native@14.1.0` (RNTL >= 14 required for Expo Router tests; `react-test-renderer` is deprecated with React 19). Config: `"preset": "jest-expo"`, optional `transformIgnorePatterns` (Bun variant accounts for `.bun` store), `collectCoverageFrom`; tests under `__tests__/` or colocated `*.test.tsx`; snapshots allowed but Expo says prefer Maestro e2e for UI. Source: https://docs.expo.dev/develop/unit-testing/.
- **E2E:** Expo's documented path is **Maestro**: `.maestro/*.yml` flows (`launchApp`, `tapOn`, `assertVisible`), run locally with `maestro test .maestro/home.yml` against an emulator, and in EAS Workflows with a `type: build` job (profile `e2e-test`: `android.buildType: apk`, `withoutCredentials: true`) feeding a `type: maestro` job. Detox's Expo support is community-only and its compatibility range stops at RN 0.84, below SDK 56+. Sources: https://docs.expo.dev/eas/workflows/examples/e2e-tests/, https://expo.dev/blog/expo-now-supports-maestro-cloud-testing-in-your-ci-workflow, https://www.pkgpulse.com/guides/detox-vs-maestro-vs-appium-react-native-e2e-testing-2026.
- **GitHub Actions on an emulator:** `reactivecircus/android-emulator-runner` on `ubuntu-latest` (2-3x faster than macOS) with the documented "Enable KVM group perms" udev step, then `maestro test .maestro/` against the APK built by `./gradlew assembleRelease`/`assembleDebug`. Maestro's own Actions guide targets Maestro Cloud (`mobile-dev-inc/action-maestro-cloud`). Sources: https://github.com/ReactiveCircus/android-emulator-runner, https://docs.maestro.dev/cloud/ci-integration/github-actions/maestro-github-action-for-android.
- **Screenshots / visual checks:** `takeScreenshot: { path: checkout/PaymentScreen, cropOn?, label? }` writes PNGs into the flow's artifact folder (`--test-output-dir`); `assertScreenshot: { path, thresholdPercentage (default 95), cropOn }` compares against a baseline created by a previous `takeScreenshot`. Upload the folder as a workflow artifact for per-screen review. Sources: https://docs.maestro.dev/api-reference/commands/takescreenshot, https://docs.maestro.dev/api-reference/commands/assertscreenshot.
- **Storybook:** `@storybook/react-native@10.7.0` (2026-10-13); Expo's guide (2025-09-25, Storybook 9) wires `withStorybook` in metro and an `app/storybook.tsx` route gated with `Stack.Protected`; stories can run as Jest tests via portable stories, but on-device visual regression is still behind web (Callstack, Feb 2026); third-party option `@sherlo/react-native-storybook`. Sources: https://expo.dev/blog/storybook-and-expo, https://www.callstack.com/events/storybook-explained-from-101-to-advanced-workflows.

**Recommendation:** jest-expo + RNTL for `lib/` logic and feature hooks; Maestro flows per screen with `takeScreenshot` as the screen-verification artifact; nightly e2e workflow on an emulator; Storybook optional later.

## 11. Icon, splash, APK builds

- **Icon:** `expo.icon` 1024x1024 square PNG; iOS: no transparency/rounded corners, or `ios.icon` as light/dark/tinted PNGs or an Icon Composer `.icon` folder (SDK 54+); Android `android.adaptiveIcon { foregroundImage, backgroundColor | backgroundImage, monochromeImage }` (monochrome for Android 13 themed icons), >= 512x512. **Splash:** `["expo-splash-screen", { image, imageWidth: 200, backgroundColor, dark: { image, backgroundColor }, resizeMode, ios/android overrides }]`, PNG only, 1024x1024 transparent source; test with a preview/production build (Expo Go and dev builds interfere). Source: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/.
- **EAS APK:** default artefact is `.aab`; `eas.json` -> `"preview": { "android": { "buildType": "apk" } }` (or `gradleCommand: ":app:assembleRelease"`), then `eas build -p android --profile preview`; install with `eas build:run -p android --latest` or `adb install`. Requires an Expo account/project. Source: https://docs.expo.dev/build-reference/apk/.
- **`eas build --local`:** same pipeline on your machine but still needs `eas login`/`EXPO_TOKEN`, macOS/Linux only (Windows unsupported, WSL untested). Source: https://docs.expo.dev/build-reference/local-builds/.
- **No account at all:** `npx expo prebuild` -> `cd android && ./gradlew app:assembleRelease` (APK) or `app:bundleRelease` (AAB); sign with a `keytool`-generated keystore wired into `gradle.properties` + `app/build.gradle`. `npx expo run:android --variant release` also produces an unsigned release build and runs it. Works on Windows with Android Studio + JDK. Sources: https://docs.expo.dev/guides/local-app-production/, https://docs.expo.dev/guides/local-app-development/.

## 12. Open-source hygiene (what top Expo/RN repos do)

- **Bluesky social-app** (root listing via GitHub API): `LICENSE`, `README.md` (with contribution rules: search issues first, discuss before PRs, no "rename Post to Skeet" or state-library rewrites), `NOTICE.md`, `AGENTS.md`, `CLAUDE.md`, `.editorconfig`, `.nvmrc`, `.husky`, `.oxlintrc.json`, `prettier.config.ts`, per-platform `tsconfig.check.{ios,android,web}.json`, `__e2e__`, `__tests__`, `eas.json`, `app.config.js`. `.github/workflows/lint.yml`: runs on PR and push to main, `concurrency` cancel-in-progress, `permissions: contents: read`, actions pinned to commit SHAs, a matrix of `lint`, `intl:lint`, `prettier`, `typecheck:ios|android|web`, `pnpm install --frozen-lockfile`, a Node-version-pin consistency check, and an aggregate "Run linters" job for branch protection. Other workflows: `nightly-e2e.yml`, `build-submit-android.yml`/`ios.yml`, `bundle-deploy-eas-update.yml`, `nightly-changelog.yml`, `zizmor.yml` (workflow security lint), `claude-review.yml`. Source: https://github.com/bluesky-social/social-app.
- **Expensify/App:** `README.md`, `contributingGuides/CONTRIBUTING.md`, `CLA.md`, `CODE_OF_CONDUCT.md`, `LICENSE.md` (MIT), `PR_REVIEW_GUIDELINES.md`, `AGENTS.md`, `CLAUDE.md`, `lefthook.yml` (git hooks), `knip.json` (dead code), `cspell.json`, `codecov.yml`, `.nvmrc`/`.bun-version`, `jest.config.js`, `.storybook/`. Source: https://github.com/Expensify/App.
- **react-native-reusables itself:** `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `COMMUNITY_RESOURCES.md`, `.claude/ .codex/ .cursor/ .gemini/` agent configs, `.nvmrc`, `.prettierrc`, `turbo.json`. Source: https://github.com/founded-labs/react-native-reusables.
- **Changelog tooling:** commit-driven (`release-please`, `semantic-release`) suits a single app with Conventional Commits enforced by `commitlint`; `changesets` suits packages where reviewable release intent matters. Sources: https://www.tenki.cloud/blog/release-automation-github-actions, https://levelup.gitconnected.com/intentional-releases-why-chose-changesets-over-semantic-release-9d16d693540b.

**Recommended set for the Plates repo:**
- `README.md`: what the app is and its no-nudge principle, screenshots, stack table, requirements (Node 22/24, Bun, Android Studio), run (`bun install`, `bunx expo run:android`), test (`bun run check`, `bun test`/`jest`, `maestro test`), build APK (both EAS and gradle paths), architecture link, contributing link, licence.
- `LICENSE` (MIT), `CONTRIBUTING.md` (issue-first, branch naming, Conventional Commits, `bun run check` must pass, how to add an rnr component, how to write a Maestro flow), `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md`, `CHANGELOG.md` (release-please), `AGENTS.md` + `CLAUDE.md` (short, like the web repo), `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`.
- Workflows: `ci.yml` (PR + main: `bun install --frozen-lockfile`, `biome ci`, `tsc --noEmit`, `expo-doctor`, `jest`), `e2e.yml` (nightly + manual: gradle assembleRelease, emulator runner with KVM, Maestro, upload screenshots), `release.yml` (release-please -> tag -> `eas build --profile preview --non-interactive` or gradle APK attached to the GitHub release). Pin actions to SHAs, set `permissions: contents: read`, enable `concurrency` cancel-in-progress, run `zizmor` on workflows.
