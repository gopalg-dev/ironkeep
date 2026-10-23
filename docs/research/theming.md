# Theming: tokens, many themes, and the status bar

Researched 2026-10-21 for the scaffold. Sources: Uniwind docs (custom themes, useCSSVariable,
class names), Uniwind 1.13 source in `node_modules/uniwind/src`, the react-native-reusables
`minimal-uniwind` template and CLI manifest, Expo's project-structure guidance, and our own
`research/stack.md` section 2.

## Findings

- **Colours live in one place.** Uniwind reads `--color-*` variables from `src/global.css`. Each
  theme is an `@variant <name>` block inside `@layer theme { :root { ... } }`, and every theme must
  define the same variables (Uniwind warns in dev when one is missing).
  https://docs.uniwind.dev/theming/custom-themes
- **`light` and `dark` are built in; any other theme is registered** by name in `metro.config.js`
  under `extraThemes`, then switched with `Uniwind.setTheme(name)`. `Uniwind.setTheme('system')`
  follows the device between `light` and `dark`. No limit on the number of themes.
  Source: same page, and `core/config/config.common.ts` (`SYSTEM_THEME = 'system'`).
- **TypeScript gets the theme names** from the generated `uniwind-types.d.ts`, which narrows
  `ThemeName` to the registered names (`core/types.ts`).
- **Reading a token as a value** (for the navigation theme, or anything that takes a colour prop):
  `useCSSVariable('--color-background')` or an array of names. It re-renders when the theme
  changes. https://docs.uniwind.dev/api/use-css-variable
- **Colour props on third-party components** (SVG `stroke`, an icon's `color`): wrap with
  `withUniwind(Component)` and pass a class with the `accent-` prefix, e.g.
  `colorClassName="accent-day-pull"`. https://docs.uniwind.dev/class-names#the-accent-prefix
- **Uniwind does not know whether a theme is light or dark.** `useUniwind()` returns only
  `{ theme, hasAdaptiveThemes }`. The status bar and other platform chrome need that, so the app
  keeps a registry of theme names with their scheme. The registry holds no colours.
- **`tailwindcss-animate` is a Tailwind 3 plugin.** The reusables CLI still lists it as a core
  dependency, but the Uniwind template imports `tw-animate-css` (the Tailwind 4 replacement) in its
  CSS. Ironkeep uses `tw-animate-css` only; the CLI doctor's prompt for `tailwindcss-animate` is
  declined on purpose.
- **Colour format.** The reusables Uniwind template writes tokens in OKLCH. Ironkeep's tokens are
  OKLCH, with the hex value beside each as a comment for people. To verify on device during the
  spike: `useCSSVariable` returns a value React Native accepts as a colour.

## Fonts

- Uniwind only maps class names to font family names; the font files are loaded by Expo.
  https://docs.uniwind.dev/faq (How do I include custom fonts?)
- Expo 58's `expo-font` plugin accepts, on Android, one `fontFamily` with a `fontDefinitions` list
  (path and weight per file). That makes one family whose weights React Native picks from
  `fontWeight`, so Tailwind's `font-medium` / `font-semibold` / `font-bold` select the right file
  instead of Android synthesising bold. iOS reads the family and weight from each file.
  https://docs.expo.dev/versions/v58.0.0/sdk/font/
- `@theme` variables do not apply to unstyled components; React Native has no font inheritance.
  https://docs.uniwind.dev/theming/global-css. The reusables `Text` merges the class from
  `TextClassContext` into every `Text`, so one provider at the root sets `font-sans` app-wide
  without editing `components/ui`. Components that set their own `TextClassContext` (the reusables
  `Button`) replace it, so the app's button wrapper adds `font-sans` itself.
- Native config (`app.json`: splash and adaptive icon colours) cannot read CSS. When the splash and
  icon are made, `app.config.ts` reads those values from `src/global.css` so they stay in step.

## Rules adopted

1. `src/global.css` is the only file with colour values. No hex, rgb, hsl or oklch literal anywhere
   in `src/**/*.ts(x)`. A check script fails the build if one appears.
2. Theme code lives in `src/theme/`: the registry (`themes.ts`), the navigation theme
   (`nav-theme.ts`), and the scheme hook.
3. Every theme has an entry in the registry with its `scheme` (`light` or `dark`). The status bar,
   the navigation theme base and the Android system bars read the scheme from there, never from the
   theme's name.
4. Adding a theme: one `@variant` block in `global.css` defining every variable, one name in
   `extraThemes`, one registry entry. Nothing else changes.
5. Fonts: Plus Jakarta Sans 400 to 800 as one family through the expo-font plugin; `--font-sans` in
   `global.css`; `font-sans` applied app-wide through `TextClassContext` at the root.
6. Native config colours come from `global.css` through `app.config.ts`, never typed by hand.
