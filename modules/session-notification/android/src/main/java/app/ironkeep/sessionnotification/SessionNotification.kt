package app.ironkeep.sessionnotification

import android.Manifest
import android.app.Notification
import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import java.io.File
import java.util.concurrent.Executors

object SessionNotification {
  const val CHANNEL = "active-workout"
  private const val ID = 4101
  val executor = Executors.newSingleThreadExecutor()

  fun store(context: Context): SessionStore {
    val process = context.getSystemService(ActivityManager::class.java).runningAppProcesses
      ?.firstOrNull { it.pid == android.os.Process.myPid() }?.processName
    check(process == "${context.packageName}:session_controls") { "Native SQLite is restricted to the controls process" }
    return SessionStore(File(context.filesDir, "SQLite/ironkeep.db"))
  }

  fun cancel(context: Context) = context.getSystemService(NotificationManager::class.java).cancel(ID)

  fun allowed(context: Context): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (!manager.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
    return Build.VERSION.SDK_INT < 26 || manager.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
  }

  fun render(context: Context, state: SessionState?) {
    SessionWidget.renderAll(context, state)
    if (state == null || !state.notificationsEnabled) { cancel(context); return }
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL, "Active workout", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      })
    }
    if (!allowed(context)) { cancel(context); return }

    val icon = context.resources.getIdentifier("ic_notification", "drawable", context.packageName)
    if (icon == 0) return
    val paused = state.pausedAt != null
    val current = state.current()
    val title = if (paused) "${state.day} · Paused" else state.day
    val progress = "${state.done} of ${state.total} sets done"
    val text = current?.let { (entry, index) -> "${entry.getString("name")} · Set ${index + 1} of ${entry.getJSONArray("sets").length()}" }
      ?: "All sets logged"
    val open = openIntent(context, state.id, "open")
    val finish = openIntent(context, state.id, "finish")
    val views = RemoteViews(context.packageName, R.layout.session_notification)
    views.setTextViewText(R.id.session_lift, current?.first?.getString("name") ?: "All sets logged")
    views.setTextViewText(R.id.session_progress, current?.let { "Set ${it.second + 1} of ${it.first.getJSONArray("sets").length()} · $progress" } ?: progress)
    views.setTextViewText(R.id.session_pause, if (paused) "Resume" else "Pause")
    views.setOnClickPendingIntent(R.id.session_pause, actionIntent(context, state, if (paused) "resume" else "pause"))
    views.setOnClickPendingIntent(R.id.session_finish, finish)
    views.setBoolean(R.id.session_finish, "setEnabled", state.done > 0)
    views.setTextViewText(R.id.session_done, current?.let { "Set ${it.second + 1} done" } ?: "Finish workout")
    views.setViewVisibility(R.id.session_finish, if (current == null) View.GONE else View.VISIBLE)
    if (current == null) {
      views.setBoolean(R.id.session_done, "setEnabled", state.done > 0)
      views.setViewVisibility(R.id.session_weight_row, View.GONE)
      views.setViewVisibility(R.id.session_amount_row, View.GONE)
      views.setOnClickPendingIntent(R.id.session_done, finish)
    } else {
      views.setViewVisibility(R.id.session_amount_row, View.VISIBLE)
      val (entry, index) = current
      val type = entry.getString("loadType")
      val amount = if (type == "time") "seconds" else "reps"
      val weight = state.value(entry, index, "weight")
      views.setViewVisibility(R.id.session_weight_row, if (type == "weight") View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.session_weight, "${number(weight)} ${state.units}")
      views.setTextViewText(R.id.session_amount, "${number(state.value(entry, index, amount))} $amount")
      views.setContentDescription(R.id.session_amount_minus, "Decrease $amount")
      views.setContentDescription(R.id.session_amount_plus, "Increase $amount")
      val controls = mapOf(
        R.id.session_weight_minus to "weight-minus", R.id.session_weight_plus to "weight-plus",
        R.id.session_amount_minus to "amount-minus", R.id.session_amount_plus to "amount-plus", R.id.session_done to "done",
      )
      for ((view, action) in controls) {
        val enabled = !paused && (action != "done" || type != "weight" || weight > 0)
        views.setBoolean(view, "setEnabled", enabled)
        if (enabled) views.setOnClickPendingIntent(view, actionIntent(context, state, action))
      }
    }
    val elapsed = state.elapsed(System.currentTimeMillis())
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
    builder.setSmallIcon(icon).setContentTitle(title).setContentText("$text · $progress")
      .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setAutoCancel(false)
      .setCategory(Notification.CATEGORY_PROGRESS).setVisibility(Notification.VISIBILITY_PRIVATE)
      .setStyle(Notification.DecoratedCustomViewStyle()).setCustomBigContentView(views)
      .setSubText(state.day)
      .setShowWhen(!paused).setUsesChronometer(!paused).setWhen(System.currentTimeMillis() - elapsed)
    if (paused) builder.setSubText("${state.day} · ${elapsed / 60000} min")
    manager.notify(ID, builder.build())
  }

  private fun number(n: Double): String = if (n % 1 == 0.0) n.toLong().toString() else n.toString()

  fun actionIntent(context: Context, state: SessionState, action: String): PendingIntent {
    val intent = Intent(context, SessionActionReceiver::class.java).apply {
      data = Uri.Builder().scheme("ironkeep-action").authority(action).appendPath(state.id).appendPath(state.token()).build()
      putExtra("session", state.id)
      putExtra("token", state.token())
      putExtra("command", action)
    }
    return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  fun openIntent(context: Context, id: String, action: String): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: error("Missing launch activity")
    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.Builder().scheme("ironkeep").authority("session-notification")
      .appendQueryParameter("id", id).appendQueryParameter("action", action).build()
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
