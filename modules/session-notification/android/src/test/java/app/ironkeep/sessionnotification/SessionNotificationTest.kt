package app.ironkeep.sessionnotification

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 35], manifest = Config.NONE)
class SessionNotificationTest {
  @Test fun disabledPreferenceCancelsAnAlreadyVisibleNotification() {
    val context = RuntimeEnvironment.getApplication()
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(SessionNotification.CHANNEL, "Active workout", NotificationManager.IMPORTANCE_LOW))
    manager.notify(4101, Notification.Builder(context, SessionNotification.CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).build())
    assertEquals(1, manager.activeNotifications.size)
    val state = SessionState("w", "Pull", "2026-10-26T09:00:00Z", null, 0, JSONArray(), JSONObject(), false)
    SessionNotification.render(context, state)
    assertEquals(0, manager.activeNotifications.size)
  }

  @Test fun systemAndChannelBlocksAreReflectedInPermissionStatus() {
    val context = RuntimeEnvironment.getApplication()
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 33) Shadows.shadowOf(context).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
    Shadows.shadowOf(manager).setNotificationsEnabled(true)
    assertTrue(SessionNotification.allowed(context))
    manager.createNotificationChannel(NotificationChannel(SessionNotification.CHANNEL, "Active workout", NotificationManager.IMPORTANCE_NONE))
    assertFalse(SessionNotification.allowed(context))
    manager.deleteNotificationChannel(SessionNotification.CHANNEL)
    Shadows.shadowOf(manager).setNotificationsEnabled(false)
    assertFalse(SessionNotification.allowed(context))
  }
}
