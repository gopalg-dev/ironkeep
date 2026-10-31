import { PermissionsAndroid, Platform } from 'react-native'

import { sessionNotification } from '../../../modules/session-notification'

export async function requestNotificationPermission(): Promise<'allowed' | 'denied' | 'blocked'> {
  if (sessionNotification?.notificationsAllowed()) return 'allowed'
  if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    if (!(await PermissionsAndroid.check(permission))) {
      const result = await PermissionsAndroid.request(permission)
      if (result === PermissionsAndroid.RESULTS.DENIED) return 'denied'
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked'
    }
  }
  return sessionNotification?.notificationsAllowed() ? 'allowed' : 'blocked'
}
