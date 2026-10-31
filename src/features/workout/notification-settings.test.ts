import { afterEach, beforeEach, expect, it, jest } from '@jest/globals'
import { getPref, setPref } from '@/db/backup'
import { setDbForTests } from '@/db/handle'
import { openTestDb } from '@/db/test-db'
import { sessionNotification } from '../../../modules/session-notification'
import { requestNotificationPermission } from './notification-permission'
import { setWorkoutNotifications, workoutNotificationsEnabled } from './notification-settings'

jest.mock('../../../modules/session-notification', () => ({
  sessionNotification: {
    notificationsAllowed: jest.fn(() => true),
    refresh: jest.fn(async () => {}),
  },
}))
jest.mock('./notification-permission', () => ({ requestNotificationPermission: jest.fn(async () => 'allowed') }))

let closeDb: () => void
beforeEach(() => {
  const { db, close } = openTestDb()
  setDbForTests(db)
  closeDb = close
  jest.clearAllMocks()
  if (!sessionNotification) throw new Error('Missing native test module')
  jest.mocked(sessionNotification.notificationsAllowed).mockReturnValue(true)
  jest.mocked(requestNotificationPermission).mockResolvedValue('allowed')
})
afterEach(() => {
  setDbForTests(undefined)
  closeDb()
})

it('preserves existing grants but never reports a blocked system permission as enabled', async () => {
  expect(await workoutNotificationsEnabled()).toBe(true)
  if (!sessionNotification) throw new Error('Missing native test module')
  jest.mocked(sessionNotification.notificationsAllowed).mockReturnValue(false)
  expect(await workoutNotificationsEnabled()).toBe(false)
  expect(requestNotificationPermission).not.toHaveBeenCalled()
})

it('persists off without asking for permission and refreshes native controls', async () => {
  await setWorkoutNotifications(false)
  expect(await getPref('workout-notifications')).toBe('false')
  expect(await workoutNotificationsEnabled()).toBe(false)
  expect(requestNotificationPermission).not.toHaveBeenCalled()
  expect(sessionNotification?.refresh).toHaveBeenCalledTimes(1)
  await setWorkoutNotifications(true)
  expect(await workoutNotificationsEnabled()).toBe(true)
})

it('keeps a denied request off even if permission is granted externally later', async () => {
  jest.mocked(requestNotificationPermission).mockResolvedValue('denied')
  expect(await setWorkoutNotifications(true)).toBe('denied')
  expect(await getPref('workout-notifications')).toBe('false')
  expect(await workoutNotificationsEnabled()).toBe(false)
})

it('only enables a blocked request after Android settings actually allows it', async () => {
  if (!sessionNotification) throw new Error('Missing native test module')
  jest.mocked(requestNotificationPermission).mockResolvedValue('blocked')
  jest.mocked(sessionNotification.notificationsAllowed).mockReturnValue(false)
  expect(await setWorkoutNotifications(true)).toBe('blocked')
  expect(await workoutNotificationsEnabled()).toBe(false)
  jest.mocked(sessionNotification.notificationsAllowed).mockReturnValue(true)
  expect(await workoutNotificationsEnabled()).toBe(true)
})

it('fails closed for malformed stored preferences', async () => {
  await setPref('workout-notifications', 'invalid')
  expect(await workoutNotificationsEnabled()).toBe(false)
})
