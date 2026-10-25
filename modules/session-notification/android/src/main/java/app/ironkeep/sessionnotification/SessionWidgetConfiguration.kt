package app.ironkeep.sessionnotification

import android.content.ComponentCallbacks
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.RemoteViews
import android.widget.TextView

/** Keep cached launcher layouts consistent with the font scale used for their breakpoints. */
internal object SessionWidgetConfiguration {
  private var listener: ComponentCallbacks? = null

  fun observe(context: Context, hasWidgets: Boolean) {
    val app = context.applicationContext
    if (!hasWidgets) {
      listener?.let { app.unregisterComponentCallbacks(it) }
      listener = null
    } else if (listener == null) {
      var scale = app.resources.configuration.fontScale
      listener = object : ComponentCallbacks {
        override fun onConfigurationChanged(configuration: Configuration) {
          if (scale == configuration.fontScale) return
          scale = configuration.fontScale
          app.sendBroadcast(Intent(app, SessionWidgetProvider::class.java)
            .setAction("${app.packageName}.REFRESH_SESSION_CONTROLS"))
        }
        override fun onLowMemory() = Unit
      }.also { app.registerComponentCallbacks(it) }
    }
  }

  fun resolveText(context: Context, layout: Int, remote: RemoteViews) {
    // A host can re-inflate cached RemoteViews after our process dies. Resolving sp now
    // prevents new font sizes being combined with old size breakpoints. The next event
    // refreshes both together; no polling or resident service is needed.
    fun visit(view: View) {
      if (view is TextView && view.id != View.NO_ID) {
        remote.setTextViewTextSize(view.id, TypedValue.COMPLEX_UNIT_PX, view.textSize)
      }
      if (view is ViewGroup) for (index in 0 until view.childCount) visit(view.getChildAt(index))
    }
    visit(LayoutInflater.from(context).inflate(layout, null))
  }
}