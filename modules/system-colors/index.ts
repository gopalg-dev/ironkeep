import { requireOptionalNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

/** One of Android's five wallpaper palettes: the tone (0 white, 1000 black, as Android names them) to "#RRGGBB". */
export type Tones = Record<string, string>

export interface SystemPalettes {
  accent1: Tones
  accent2: Tones
  accent3: Tones
  neutral1: Tones
  neutral2: Tones
}

interface SystemColorsNative {
  getPalettes(): SystemPalettes | null
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<SystemColorsNative>('SystemColors') : null

/** The phone's Material You palettes on Android 12 and up; null anywhere else. */
export function getSystemPalettes(): SystemPalettes | null {
  return native?.getPalettes() ?? null
}
