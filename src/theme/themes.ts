/**
 * Every theme the app ships, with whether it is a light or a dark theme. Colours are not here: each
 * theme's colours are an `@variant` block in `src/global.css`. A theme other than `light` and `dark`
 * is also listed under `extraThemes` in `metro.config.js`. See `docs/research/theming.md`.
 */
export const THEMES = {
  light: { label: 'Slate', scheme: 'light' },
  dark: { label: 'Slate', scheme: 'dark' },
  latte: { label: 'Catppuccin Latte', scheme: 'light' },
  lime: { label: 'Lime', scheme: 'dark' },
  dracula: { label: 'Dracula', scheme: 'dark' },
  /** The phone's own colours, one theme per scheme; painted at runtime, see `src/theme/look.ts`. */
  'you-light': { label: 'Your phone', scheme: 'light' },
  'you-dark': { label: 'Your phone', scheme: 'dark' },
} as const satisfies Record<string, ThemeInfo>

export type ThemeScheme = 'light' | 'dark'

export interface ThemeInfo {
  label: string
  scheme: ThemeScheme
}

export type AppTheme = keyof typeof THEMES

const isAppTheme = (name: string): name is AppTheme => Object.hasOwn(THEMES, name)

/** Light or dark for a theme name. An unknown name reads as light, the safer default for contrast. */
export function schemeOf(theme: string): ThemeScheme {
  return isAppTheme(theme) ? THEMES[theme].scheme : 'light'
}
