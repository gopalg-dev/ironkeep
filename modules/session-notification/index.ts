import { requireOptionalNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

interface SessionNotificationNative {
  refresh(): Promise<void>
  cancel(): void
  beginWrite(): void
  endWrite(): void
  claimPermissionPrompt(): boolean
  addListener(event: 'onSessionChanged', listener: () => void): { remove(): void }
}

/** Android only; old debug clients and iOS keep their existing in-app controls. */
export const sessionNotification =
  Platform.OS === 'android' ? requireOptionalNativeModule<SessionNotificationNative>('SessionNotification') : null
