package app.ironkeep.sessionnotification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
    Function("claimPermissionPrompt") {
      val context = appContext.reactContext ?: return@Function false
      val prefs = context.getSharedPreferences("session-notification", 0)
      if (prefs.getBoolean("asked", false)) false else {
        prefs.edit().putBoolean("asked", true).apply()
        true
      }
    }
    Function("cancel") { appContext.reactContext?.let { SessionNotification.cancel(it); SessionWidget.unavailable(it) }; Unit }
  }
}
