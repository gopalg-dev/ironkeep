import type { ConfigContext, ExpoConfig } from 'expo/config'

import { colorHex } from './scripts/css-tokens'

/**
 * Extends app.json with the colours the native shell needs before JavaScript runs: the splash
 * screen and the adaptive icon background. They are read from `src/global.css` so no colour is
 * written twice (docs/engineering.md, React Native rules).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const light = colorHex('light', 'background')
  const dark = colorHex('dark', 'background')
  const plugins: NonNullable<ExpoConfig['plugins']> = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      const options = typeof plugin[1] === 'object' && plugin[1] !== null ? plugin[1] : {}
      const entry: [string, unknown] = [
        plugin[0],
        { ...options, backgroundColor: light, dark: { backgroundColor: dark } },
      ]
      return entry
    }
    return plugin
  })

  return {
    ...config,
    name: config.name ?? 'Ironkeep',
    slug: config.slug ?? 'ironkeep',
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android?.adaptiveIcon, backgroundColor: light },
    },
    plugins,
  }
}
