package app.ironkeep.sessionnotification

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.SystemClock
import android.os.Build
import android.content.res.Configuration
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews

object SessionWidget {
  fun renderAll(context: Context, state: SessionState?) = publish(context, state, false)
  fun unavailable(context: Context) = publish(context, null, true)

  private fun publish(context: Context, state: SessionState?, failed: Boolean) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, SessionWidgetProvider::class.java))
    SessionWidgetConfiguration.observe(context, ids.isNotEmpty())
    val (fullWidth, fullHeight) = controlSize(context)
    for (id in ids) {
      val rendered = if (Build.VERSION.SDK_INT >= 31) {
        RemoteViews(mapOf(
          SizeF(180f, 48f) to views(context, state, failed, true, true, fillCard = true),
          SizeF(180f, compactHeight(context)) to views(context, state, failed, true, fillCard = true),
          SizeF(180f, compactHeight(context) + 48f) to views(context, state, failed, true),
          SizeF(fullWidth, fullHeight) to views(context, state, failed),
        ))
      } else {
        val options = manager.getAppWidgetOptions(id)
        val landscape = context.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        val height = options.getInt(if (landscape) AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
        val width = options.getInt(if (landscape) AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        views(context, state, failed, height < fullHeight || width < fullWidth, height < compactHeight(context))
      }
      manager.updateAppWidget(id, rendered)
    }
  }

  internal fun compactHeight(context: Context): Float =
    80f + 40f * (context.resources.configuration.fontScale - 1f).coerceAtLeast(0f)

  // Reserve room for scaled text before offering the controls to a launcher.
  internal fun controlSize(context: Context): Pair<Float, Float> {
    val extra = (context.resources.configuration.fontScale - 1f).coerceAtLeast(0f)
    return Pair(250f + 100f * extra, 220f + 120f * extra)
  }

  internal fun views(context: Context, state: SessionState?, failed: Boolean = false, compact: Boolean = false, strip: Boolean = false, fillCard: Boolean = false): RemoteViews {
    val card = strip || compact || state == null || state.current() == null
    val layout = if (strip) R.layout.session_widget_strip else if (card) R.layout.session_widget_compact else R.layout.session_widget
    val views = RemoteViews(context.packageName, layout)
    SessionWidgetConfiguration.resolveText(context, layout, views)
    if (card && Build.VERSION.SDK_INT >= 31) {
      // Hosts may reuse this layout after resizing; always reset the previous height.
      val height = if (fillCard) android.view.ViewGroup.LayoutParams.MATCH_PARENT.toFloat()
        else if (strip) 48f else android.view.ViewGroup.LayoutParams.WRAP_CONTENT.toFloat()
      val unit = if (height < 0) android.util.TypedValue.COMPLEX_UNIT_PX else android.util.TypedValue.COMPLEX_UNIT_DIP
      views.setViewLayoutHeight(R.id.widget_card, height, unit)
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val open = if (state != null) SessionNotification.openIntent(context, state.id, "open")
      else launch?.let { PendingIntent.getActivity(context, 4102, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    if (open != null) {
      views.setOnClickPendingIntent(R.id.widget_header, open)
      views.setOnClickPendingIntent(R.id.widget_open, open)
    }
    if (state == null) {
      views.setTextViewText(R.id.widget_lift, "IronKeep")
      views.setTextViewText(R.id.widget_day, if (failed) "Session unavailable" else "No active session")
      views.setContentDescription(R.id.widget_open, "Open IronKeep")
      views.setViewVisibility(R.id.widget_controls, View.GONE)
      views.setViewVisibility(R.id.widget_progress, View.GONE)
      views.setViewVisibility(R.id.widget_clock, View.GONE)
      views.setViewVisibility(R.id.widget_open, View.VISIBLE)
      return views
    }
    // Hosts may reapply this layout to an existing view; reset every conditional visibility.
    views.setViewVisibility(R.id.widget_controls, View.VISIBLE)
    views.setViewVisibility(R.id.widget_progress, View.VISIBLE)
    views.setViewVisibility(R.id.widget_open, View.GONE)
    views.setContentDescription(R.id.widget_open, "Open session")
    val paused = state.pausedAt != null
    val current = state.current()
    views.setTextViewText(R.id.widget_day, if (paused) "${state.day} \u00b7 Paused" else state.day)
    views.setTextViewText(R.id.widget_lift, current?.first?.getString("name") ?: "All sets logged")
    views.setTextViewText(R.id.widget_progress, "${state.done} of ${state.total} sets done")
    val completedAt = state.lastCompletedAt
    views.setViewVisibility(R.id.widget_clock, if (completedAt == null) View.GONE else View.VISIBLE)
    if (completedAt != null) {
      val since = maxOf(0, System.currentTimeMillis() - completedAt)
      views.setChronometer(R.id.widget_clock, SystemClock.elapsedRealtime() - since, "%s since set", true)
    }
    if (card) {
      if (current == null) views.setTextViewText(R.id.widget_day, "${state.done} of ${state.total} sets done")
      views.setViewVisibility(R.id.widget_clock, View.GONE)
      views.setViewVisibility(R.id.widget_progress, View.GONE)
      views.setViewVisibility(R.id.widget_controls, View.GONE)
      views.setViewVisibility(R.id.widget_open, View.VISIBLE)
      return views
    }
    val (entry, index) = current ?: return views
    val type = entry.getString("loadType")
    val amount = if (type == "time") "seconds" else "reps"
    val weight = state.value(entry, index, "weight")
    views.setViewVisibility(R.id.widget_weight_row, if (type == "weight") View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.widget_weight, "${number(weight)} ${state.units}")
    views.setTextViewText(R.id.widget_amount, "${number(state.value(entry, index, amount))} $amount")
    views.setTextViewText(R.id.widget_done, "Done ${index + 1}/${entry.getJSONArray("sets").length()}")
    views.setContentDescription(R.id.widget_done, "Set ${index + 1} of ${entry.getJSONArray("sets").length()} done")
    views.setTextViewText(R.id.widget_pause, if (paused) "Resume" else "Pause")
    views.setContentDescription(R.id.widget_amount_minus, "Decrease $amount")
    views.setContentDescription(R.id.widget_amount_plus, "Increase $amount")
    views.setOnClickPendingIntent(R.id.widget_pause, SessionNotification.actionIntent(context, state, if (paused) "resume" else "pause"))
    val actions = mapOf(
      R.id.widget_weight_minus to "weight-minus", R.id.widget_weight_plus to "weight-plus",
      R.id.widget_amount_minus to "amount-minus", R.id.widget_amount_plus to "amount-plus",
      R.id.widget_add to "add-set", R.id.widget_done to "done",
    )
    for ((view, action) in actions) {
      val enabled = !paused && (action != "done" || type != "weight" || weight > 0)
      views.setBoolean(view, "setEnabled", enabled)
      views.setFloat(view, "setAlpha", if (enabled) 1f else 0.4f)
      // Always replace the old PendingIntent, even when disabled, so a host cannot reuse its target.
      views.setOnClickPendingIntent(view, SessionNotification.actionIntent(context, state, action))
    }
    return views
  }

  private fun number(n: Double): String = if (n % 1 == 0.0) n.toLong().toString() else n.toString()
}
