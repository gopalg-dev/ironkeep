/** Notifications are Android-only in this release. */
export async function requestNotificationPermission(): Promise<'allowed' | 'denied' | 'blocked'> {
  return 'blocked'
}
