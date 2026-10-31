package app.ironkeep.sessionnotification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.app.NotificationManager
import android.os.Build
import android.provider.Settings
import android.net.Uri
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SessionNotificationModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("SessionNotification")
    Events("onSessionChanged")
    OnCreate {
      appContext.reactContext?.let { context ->
        val listener = object : BroadcastReceiver() {
          override fun onReceive(context: Context, intent: Intent) { sendEvent("onSessionChanged") }
        }
        ContextCompat.registerReceiver(context, listener, IntentFilter("${context.packageName}.SESSION_CHANGED"), ContextCompat.RECEIVER_NOT_EXPORTED)
        receiver = listener
      }
    }
    OnDestroy {
      receiver?.let { appContext.reactContext?.unregisterReceiver(it) }
      receiver = null
    }

    // Read only in :session_controls: Expo and Android SQLite must not share a process.
    // The persisted receipt supplies the exact same target token to the widget and notification.
    AsyncFunction("refresh") {
      appContext.reactContext?.let { context ->
        context.sendBroadcast(Intent(context, SessionWidgetProvider::class.java)
          .setAction("${context.packageName}.REFRESH_SESSION_CONTROLS"))
      }
      Unit
    }
    Function("beginWrite") { appContext.reactContext?.let { SessionWriteGate.begin(it) }; Unit }
    Function("endWrite") {
      SessionWriteGate.end()
      appContext.reactContext?.let { context ->
        context.sendBroadcast(Intent(context, SessionWidgetProvider::class.java)
          .setAction("${context.packageName}.REFRESH_SESSION_CONTROLS"))
      }
      Unit
    }
    Function("notificationsAllowed") {
      appContext.reactContext?.let { SessionNotification.allowed(it) } ?: false
    }
    Function("openNotificationSettings") {
      appContext.reactContext?.let { context ->
        val manager = context.getSystemService(NotificationManager::class.java)
        val intent = if (Build.VERSION.SDK_INT >= 26) {
          if (manager.areNotificationsEnabled() && manager.getNotificationChannel(SessionNotification.CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE) {
            Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_CHANNEL_ID, SessionNotification.CHANNEL)
          } else Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        } else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
      Unit
    }
    Function("cancel") { appContext.reactContext?.let { SessionNotification.cancel(it); SessionWidget.unavailable(it) }; Unit }
  }
}
