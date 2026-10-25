package app.ironkeep.sessionnotification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Runs only for a tap. No timer, wake lock, job, foreground service, or React/Metro boot. */
class SessionActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra("command") ?: return
    val id = intent.getStringExtra("session") ?: return
    val token = intent.getStringExtra("token") ?: return
    val pending = goAsync()
    SessionNotification.executor.execute {
      try {
        // Let an in-app number edit finish saving before accepting a competing native edit.
        SessionWriteGate.tryAction(context) {
          val state = SessionNotification.store(context).transact(action, id, token)
          SessionNotification.render(context, state)
          context.sendBroadcast(Intent("${context.packageName}.SESSION_CHANGED").setPackage(context.packageName))
        }
      } catch (error: Exception) {
        Log.e("IronKeepNotification", "Could not apply session action", error)
        SessionWidget.unavailable(context)
        SessionNotification.cancel(context) // Never leave actionable stale values after a failed write.
      } finally {
        pending.finish()
      }
    }
  }
}
