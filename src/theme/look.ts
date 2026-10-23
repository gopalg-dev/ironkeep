import { Appearance, AppState } from 'react-native'
import { Uniwind } from 'uniwind'

import { getPref, setPref } from '@/db/backup'
import { getSystemPalettes } from '../../modules/system-colors'
import { materialTokens } from './material-you'
import { type AppTheme, THEMES, type ThemeScheme } from './themes'

/**
 * A look: a Slate theme by name, the phone's own light-or-dark choice on Slate, or the phone's own
 * colours (Material You, Android 12 and up), which follow the phone's light-or-dark choice too.
 */
export type Look = AppTheme | 'system' | 'you'

export const SYSTEM_LOOK = 'system' as const
export const YOU_LOOK = 'you' as const
const PREF_LOOK = 'look'

/** The two themes the phone's colours are written onto, one per scheme; `global.css` holds their blocks. */
const YOU_THEME: Record<ThemeScheme, AppTheme> = { light: 'you-light', dark: 'you-dark' }
const isYouTheme = (t: string): boolean => t === YOU_THEME.light || t === YOU_THEME.dark

/** The looks on offer: the Slate themes, Slate following the phone, and the phone's colours where they exist. */
export function lookOptions(): { id: Look; label: string }[] {
  const slate = (Object.keys(THEMES) as AppTheme[])
    .filter((t) => !isYouTheme(t))
    .map((t) => ({ id: t as Look, label: `${THEMES[t].label}, ${THEMES[t].scheme}` }))
  const you = getSystemPalettes() ? [{ id: YOU_LOOK, label: "Your phone's colours" }] : []
  return [...slate, { id: SYSTEM_LOOK, label: 'Slate, follows the phone' }, ...you]
}

const isLook = (v: string): v is Look => v === SYSTEM_LOOK || v === YOU_LOOK || Object.hasOwn(THEMES, v)

/** The look as the Settings row shows it, from what Uniwind reports. */
export function currentLook(theme: string, hasAdaptiveThemes: boolean): Look {
  if (isYouTheme(theme)) return YOU_LOOK
  if (hasAdaptiveThemes) return SYSTEM_LOOK
  return isLook(theme) ? theme : 'light'
}

const phoneScheme = (): ThemeScheme => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')

/** The palettes as last painted, so a return to the app repaints only when the phone's colours changed. */
let painted: string | null = null

/** Reads the phone's palettes now and writes them onto the two you-themes; false when the phone has none. */
function paintPhoneColours(): boolean {
  const palettes = getSystemPalettes()
  if (!palettes) return false
  const key = JSON.stringify(palettes)
  if (key === painted) return true
  painted = key
  Uniwind.updateCSSVariables(YOU_THEME.light, materialTokens(palettes, 'light'))
  Uniwind.updateCSSVariables(YOU_THEME.dark, materialTokens(palettes, 'dark'))
  return true
}

/** Switches the look now and keeps it for the next launch. */
export async function applyLook(look: Look): Promise<void> {
  if (look === YOU_LOOK) {
    if (!paintPhoneColours()) return
    Uniwind.setTheme(YOU_THEME[phoneScheme()])
  } else {
    Uniwind.setTheme(look)
  }
  await setPref(PREF_LOOK, look)
}

/** Puts the kept look back, at launch once the data is open. The phone's colours are read afresh each time. */
export async function restoreLook(): Promise<void> {
  const kept = await getPref(PREF_LOOK)
  if (!kept || !isLook(kept)) return
  if (kept === YOU_LOOK) {
    if (paintPhoneColours()) Uniwind.setTheme(YOU_THEME[phoneScheme()])
    return
  }
  Uniwind.setTheme(kept)
}

/**
 * Keeps the phone's-colours look in step with the phone: on the light-or-dark switch (Uniwind's own
 * system theme only knows `light` and `dark`, so this look follows it by hand), and on a return to
 * the app, when the colours under Wallpaper & style may have changed. Returns the stop function.
 */
export function followPhone(): () => void {
  const scheme = Appearance.addChangeListener(() => {
    if (isYouTheme(Uniwind.currentTheme)) Uniwind.setTheme(YOU_THEME[phoneScheme()])
  })
  const state = AppState.addEventListener('change', (next) => {
    if (next === 'active' && isYouTheme(Uniwind.currentTheme)) paintPhoneColours()
  })
  return () => {
    scheme.remove()
    state.remove()
  }
}
