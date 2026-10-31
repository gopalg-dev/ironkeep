import { z } from 'zod'

import { getPref, setPref } from '@/db/backup'
import { sessionNotification } from '../../../modules/session-notification'
import { requestNotificationPermission } from './notification-permission'

const KEY = 'workout-notifications'
const storedPreference = z.enum(['true', 'false']).nullable()

export async function workoutNotificationsEnabled(): Promise<boolean> {
  const stored = storedPreference.safeParse(await getPref(KEY))
  return stored.success && stored.data !== 'false' && (sessionNotification?.notificationsAllowed() ?? false)
}

export async function setWorkoutNotifications(enabled: boolean): Promise<'allowed' | 'denied' | 'blocked'> {
  const permission = enabled ? await requestNotificationPermission() : 'denied'
  // A blocked permission stays off until Android allows it, including after returning from Settings.
  await setPref(KEY, String(enabled && permission !== 'denied'))
  await sessionNotification?.refresh()
  return permission
}
