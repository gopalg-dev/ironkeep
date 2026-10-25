import { PermissionsAndroid, Platform } from 'react-native'

export async function requestNotificationPermission(): Promise<void> {
  if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
  }
}
