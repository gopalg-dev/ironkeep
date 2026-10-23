import type { SystemPalettes } from '../../modules/system-colors'
import type { ThemeScheme } from './themes'

/*
 * The phone's colours on our tokens. Android 12 and up publish five tonal palettes built from the
 * wallpaper (or the colour picked under Wallpaper & style); Material 3 reads its roles off them at
 * fixed tones. Android names a tone by its darkness: 0 is white, 500 the middle, 1000 black. The map
 * below follows the Material roles: the primary at tone 40 on light (600) and 80 on dark (200), the
 * surfaces off the first neutral palette, the outline and the quiet text off the second. Day
 * colours, success, destructive and the scrim stay ours: they carry meaning, not decoration.
 */

/** The colour tokens of `global.css` the phone's palette takes over, with the tone each reads. */
const ROLES: Record<ThemeScheme, Record<string, [keyof SystemPalettes, number]>> = {
  light: {
    '--color-background': ['neutral1', 10],
    '--color-foreground': ['neutral1', 900],
    '--color-card': ['neutral1', 0],
    '--color-card-foreground': ['neutral1', 900],
    '--color-popover': ['neutral1', 0],
    '--color-popover-foreground': ['neutral1', 900],
    '--color-primary': ['accent1', 600],
    '--color-primary-foreground': ['accent1', 0],
    '--color-secondary': ['neutral2', 50],
    '--color-secondary-foreground': ['neutral1', 900],
    '--color-muted': ['neutral2', 50],
    '--color-muted-foreground': ['neutral2', 700],
    '--color-accent': ['neutral2', 50],
    '--color-accent-foreground': ['neutral1', 900],
    '--color-border': ['neutral2', 100],
    '--color-input': ['neutral2', 100],
    '--color-ring': ['accent1', 600],
  },
  dark: {
    '--color-background': ['neutral1', 900],
    '--color-foreground': ['neutral1', 100],
    '--color-card': ['neutral1', 800],
    '--color-card-foreground': ['neutral1', 100],
    '--color-popover': ['neutral1', 800],
    '--color-popover-foreground': ['neutral1', 100],
    '--color-primary': ['accent1', 200],
    '--color-primary-foreground': ['accent1', 800],
    '--color-secondary': ['neutral1', 700],
    '--color-secondary-foreground': ['neutral1', 100],
    '--color-muted': ['neutral1', 700],
    '--color-muted-foreground': ['neutral2', 200],
    '--color-accent': ['neutral1', 700],
    '--color-accent-foreground': ['neutral1', 100],
    '--color-border': ['neutral2', 700],
    '--color-input': ['neutral2', 700],
    '--color-ring': ['accent1', 200],
  },
}

/**
 * The token values for one scheme from the phone's palettes, as `Uniwind.updateCSSVariables` takes
 * them. A tone the phone did not publish leaves that token as it is.
 */
export function materialTokens(palettes: SystemPalettes, scheme: ThemeScheme): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [token, [palette, tone]] of Object.entries(ROLES[scheme])) {
    const hex = palettes[palette]?.[String(tone)]
    if (hex) out[token] = hex
  }
  return out
}

/** The tokens the phone's colours take over, for the record and the tests. */
export const MATERIAL_TOKENS = Object.keys(ROLES.light)
