import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'
import type { ColorValue } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { useThemeScheme } from './use-theme-scheme'

const TOKENS = [
  '--color-background',
  '--color-border',
  '--color-card',
  '--color-destructive',
  '--color-primary',
  '--color-foreground',
] as const

const asColor = (value: unknown, fallback: ColorValue): ColorValue => (typeof value === 'string' ? value : fallback)

/**
 * The navigation theme, read from the active theme's tokens in `src/global.css` so no colour is
 * written twice. Follows theme changes.
 */
export function useNavTheme(): Theme {
  const base = useThemeScheme() === 'dark' ? DarkTheme : DefaultTheme
  const [background, border, card, notification, primary, text] = useCSSVariable([...TOKENS])

  return {
    ...base,
    colors: {
      background: asColor(background, base.colors.background),
      border: asColor(border, base.colors.border),
      card: asColor(card, base.colors.card),
      notification: asColor(notification, base.colors.notification),
      primary: asColor(primary, base.colors.primary),
      text: asColor(text, base.colors.text),
    },
  }
}
