package app.ironkeep.sessionnotification

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log

/** Launcher events and committed edits only. Android owns the ticking clock. */
class SessionWidgetProvider : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == "${context.packageName}.REFRESH_SESSION_CONTROLS") refresh(context)
    else super.onReceive(context, intent)
  }

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = refresh(context)
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) = refresh(context)

  private fun refresh(context: Context) {
    val pending = goAsync()
    SessionNotification.executor.execute {
      try {
        SessionWriteGate.tryAction(context) {
          SessionNotification.render(context, SessionNotification.store(context).transact())
        }
      } catch (error: Exception) {
        Log.e("IronKeepWidget", "Could not update workout widget", error)
        SessionWidget.unavailable(context)
        SessionNotification.cancel(context)
      } finally {
        pending.finish()
      }
    }
  }
}
