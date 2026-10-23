import { useUniwind } from 'uniwind'

import { schemeOf, type ThemeScheme } from './themes'

/** Whether the active theme is a light or a dark one. For platform chrome: status bar, system bars. */
export function useThemeScheme(): ThemeScheme {
  const { theme } = useUniwind()
  return schemeOf(theme)
}
