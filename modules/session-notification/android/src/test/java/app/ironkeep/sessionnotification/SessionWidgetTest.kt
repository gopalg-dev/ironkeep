package app.ironkeep.sessionnotification

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
import android.view.View
import android.widget.Button
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class SessionWidgetTest {
  private val context get() = RuntimeEnvironment.getApplication()

  @Before fun launcher() {
    val info = ResolveInfo().apply {
      activityInfo = ActivityInfo().apply {
        name = "TestActivity"
        packageName = context.packageName
        applicationInfo = context.applicationInfo
      }
    }
    val manager = shadowOf(context.packageManager)
    manager.addOrUpdateActivity(info.activityInfo)
    manager.addIntentFilterForActivity(
      android.content.ComponentName(context.packageName, info.activityInfo.name),
      android.content.IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) })
  }

  private fun state(type: String = "weight") = SessionState("sample", "Legs", "2026-10-25T09:00:00Z", null, 0,
    JSONArray("""[{"exerciseId":"curl","name":"Leg curl","loadType":"$type","repMin":15,"sets":[{"weight":25,"done":false}]}]"""), JSONObject())

  @Test fun hostRecoversFromIdlePausedAndCompletedLayouts() {
    val state = state()
    var view = SessionWidget.views(context, state).apply(context, null)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_controls).visibility)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_progress).visibility)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_open).visibility)
    assertEquals("25 kg", view.findViewById<TextView>(R.id.widget_weight).text.toString())
    state.apply("pause", 1792922400000)
    SessionWidget.views(context, state).reapply(context, view)
    assertFalse(view.findViewById<Button>(R.id.widget_done).isEnabled)
    assertFalse(view.findViewById<Button>(R.id.widget_add).isEnabled)
    assertEquals("Resume", view.findViewById<TextView>(R.id.widget_pause).text.toString())
    state.apply("resume", 1792922401000)
    state.apply("done", 1792922402000)
    view = SessionWidget.views(context, state).apply(context, null)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_controls).visibility)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_open).visibility)
    view = SessionWidget.views(context, state()).apply(context, null)
    assertTrue(view.findViewById<Button>(R.id.widget_done).isEnabled)
    view = SessionWidget.views(context, null).apply(context, null)
    assertEquals("Open IronKeep", view.findViewById<View>(R.id.widget_open).contentDescription.toString())
    view = SessionWidget.views(context, state()).apply(context, null)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_controls).visibility)
  }

  @Test fun timeAndBodyweightDoNotShowWeightAndClockOnlyShowsKnownCompletion() {
    val state = state("time")
    val view = SessionWidget.views(context, state).apply(context, null)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_weight_row).visibility)
    assertEquals("15 seconds", view.findViewById<TextView>(R.id.widget_amount).text.toString())
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_clock).visibility)
    state.lastCompletedAt = System.currentTimeMillis() - 90000
    SessionWidget.views(context, state).reapply(context, view)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_clock).visibility)
    SessionWidget.views(context, state("bodyweight")).reapply(context, view)
    assertEquals("15 reps", view.findViewById<TextView>(R.id.widget_amount).text.toString())
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_clock).visibility)
    SessionWidget.views(context, state()).reapply(context, view)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_weight_row).visibility)
  }
  @Test fun compactWidgetOpensTheSessionWithoutClippedControls() {
    val view = SessionWidget.views(context, state(), compact = true).apply(context, null)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_controls).visibility)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_progress).visibility)
    assertEquals(View.GONE, view.findViewById<View>(R.id.widget_clock).visibility)
    assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widget_open).visibility)
    assertEquals("Open session", view.findViewById<View>(R.id.widget_open).contentDescription.toString())
  }

  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun everyControlFitsAtTheSmallestAdvertisedSizeIncludingScaledText() {
    for (scale in listOf(1f, 1.3f, 2f)) {
      val configuration = android.content.res.Configuration(context.resources.configuration)
      configuration.fontScale = scale
      val sizedContext = context.createConfigurationContext(configuration)
      val density = sizedContext.resources.displayMetrics.density
      val (width, height) = SessionWidget.controlSize(sizedContext)
      for (paused in listOf(false, true)) {
        val state = state().apply {
          lastCompletedAt = System.currentTimeMillis() - 90000
          if (paused) apply("pause", System.currentTimeMillis())
        }
        val root = SessionWidget.views(sizedContext, state).apply(sizedContext, null)
        root.measure(View.MeasureSpec.makeMeasureSpec((width * density).toInt(), View.MeasureSpec.EXACTLY),
          View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
        root.layout(0, 0, root.measuredWidth, root.measuredHeight)
        for (id in listOf(R.id.widget_add, R.id.widget_pause, R.id.widget_done,
          R.id.widget_weight_minus, R.id.widget_weight_plus, R.id.widget_amount_minus, R.id.widget_amount_plus)) {
          val button = root.findViewById<Button>(id)
          val bounds = android.graphics.Rect(0, 0, button.width, button.height)
          (root as android.view.ViewGroup).offsetDescendantRectToMyCoords(button, bounds)
          assertTrue("Control $id clipped at font scale $scale: $bounds in ${root.width}x${root.height}",
            bounds.left >= root.paddingLeft && bounds.right <= root.width - root.paddingRight &&
            bounds.top >= root.paddingTop && bounds.bottom <= root.height - root.paddingBottom)
          assertTrue("Touch target at $scale", button.width >= 48 * density && button.height >= 48 * density)
          val textLayout = button.layout
          assertTrue("Label clipped at $scale: ${button.text}",
            textLayout.height <= button.height - button.compoundPaddingTop - button.compoundPaddingBottom)
          assertEquals("Whole label visible at $scale", button.text.length, textLayout.getLineEnd(textLayout.lineCount - 1))
        }
      }
    }
  }

  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun oneCellLandscapeStripFitsWithoutReservingASecondRow() {
    val density = context.resources.displayMetrics.density
    for (state in listOf(null, state())) {
      val root = SessionWidget.views(context, state, strip = true).apply(context, null) as android.view.ViewGroup
      root.measure(View.MeasureSpec.makeMeasureSpec((180 * density).toInt(), View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec((48 * density).toInt(), View.MeasureSpec.EXACTLY))
      root.layout(0, 0, root.measuredWidth, root.measuredHeight)
      val open = root.findViewById<View>(R.id.widget_open)
      assertEquals((48 * density).toInt(), open.height)
      assertTrue(root.getChildAt(0).height <= root.height)
      assertEquals(View.GONE, root.findViewById<View>(R.id.widget_day).visibility)
      assertEquals(if (state == null) "Open IronKeep" else "Open session", open.contentDescription.toString())
    }
  }

  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun idleCardDoesNotPaintAnEmptyPanelAcrossALargeSlot() {
    val density = context.resources.displayMetrics.density
    val root = SessionWidget.views(context, null).apply(context, null) as android.view.ViewGroup
    root.measure(View.MeasureSpec.makeMeasureSpec((250 * density).toInt(), View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec((340 * density).toInt(), View.MeasureSpec.EXACTLY))
    root.layout(0, 0, root.measuredWidth, root.measuredHeight)
    assertNull(root.background)
    assertTrue("Idle card should fit one short row", root.getChildAt(0).height <= 80 * density)
    assertEquals("No active session", root.findViewById<TextView>(R.id.widget_day).text.toString())
    val small = SessionWidget.views(context, null).apply(context, null) as android.view.ViewGroup
    small.measure(View.MeasureSpec.makeMeasureSpec((180 * density).toInt(), View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec((80 * density).toInt(), View.MeasureSpec.EXACTLY))
    small.layout(0, 0, small.measuredWidth, small.measuredHeight)
    assertTrue(small.findViewById<View>(R.id.widget_open).height >= 48 * density)
  }

  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun smallCardsKeepTextAndOpenTargetInsideTheirSlot() {
    for (scale in listOf(1f, 1.3f, 2f)) for (width in listOf(180, 250, 360, 412)) {
      val config = android.content.res.Configuration(context.resources.configuration).apply { fontScale = scale }
      val sized = context.createConfigurationContext(config)
      val density = sized.resources.displayMetrics.density
      val active = state().apply { entries.getJSONObject(0).put("name", "Single leg seated machine hamstring curl") }
      val paused = state().apply { apply("pause", System.currentTimeMillis()) }
      val completed = state().apply { apply("done", System.currentTimeMillis()) }
      for (state in listOf(null, active, paused, completed)) for (strip in listOf(false, true)) {
        val height = if (strip) 48f else SessionWidget.compactHeight(sized)
        val root = SessionWidget.views(sized, state, compact = true, strip = strip).apply(sized, null) as android.view.ViewGroup
        root.measure(View.MeasureSpec.makeMeasureSpec((width * density).toInt(), View.MeasureSpec.EXACTLY),
          View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
        root.layout(0, 0, root.measuredWidth, root.measuredHeight)
        for (id in listOf(R.id.widget_lift, R.id.widget_day)) {
          val text = root.findViewById<TextView>(id)
          if (text.visibility != View.VISIBLE) continue
          val bounds = android.graphics.Rect(0, 0, text.width, text.height)
          root.offsetDescendantRectToMyCoords(text, bounds)
          val description = "${text.text}, scale=$scale width=$width strip=$strip bounds=$bounds height=${root.height}"
          assertTrue(description, bounds.top >= 0 && bounds.bottom <= root.height && bounds.left >= 0 && bounds.right <= root.width)
          assertTrue("Text clipped: $description", text.layout.height <= text.height - text.compoundPaddingTop - text.compoundPaddingBottom)
        }
        val open = root.findViewById<View>(R.id.widget_open)
        assertTrue(open.width >= 48 * density && open.height >= 48 * density)
      }
    }
  }
  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun fullControlsFitLongNamesLargeNumbersAndBothThemes() {
    for (scale in listOf(1f, 1.3f, 2f)) for (night in listOf(false, true)) for (type in listOf("weight", "bodyweight", "time")) {
      val config = android.content.res.Configuration(context.resources.configuration).apply {
        fontScale = scale
        uiMode = android.content.res.Configuration.UI_MODE_TYPE_NORMAL or
          if (night) android.content.res.Configuration.UI_MODE_NIGHT_YES else android.content.res.Configuration.UI_MODE_NIGHT_NO
      }
      val sized = context.createConfigurationContext(config)
      val density = sized.resources.displayMetrics.density
      val state = state(type).apply {
        settings.put("units", "lb")
        entries.getJSONObject(0).put("name", "Single leg seated machine hamstring curl")
        val sets = entries.getJSONObject(0).getJSONArray("sets")
        for (i in 0 until 12) sets.put(i, JSONObject().put("done", i < 11).put("weight", 999.5).put("reps", 120).put("seconds", 300))
        lastCompletedAt = System.currentTimeMillis() - 36000000
      }
      val (width, height) = SessionWidget.controlSize(sized)
      val root = SessionWidget.views(sized, state).apply(sized, null) as android.view.ViewGroup
      root.measure(View.MeasureSpec.makeMeasureSpec((width * density).toInt(), View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
      root.layout(0, 0, root.measuredWidth, root.measuredHeight)
      for (id in listOf(R.id.widget_amount, R.id.widget_done, R.id.widget_pause, R.id.widget_add, R.id.widget_progress, R.id.widget_clock) +
        if (type == "weight") listOf(R.id.widget_weight) else emptyList()) {
        val text = root.findViewById<TextView>(id)
        val bounds = android.graphics.Rect(0, 0, text.width, text.height)
        root.offsetDescendantRectToMyCoords(text, bounds)
        val label = "${text.text} scale=$scale night=$night type=$type bounds=$bounds host=${root.width}x${root.height}"
        assertTrue(label, bounds.left >= 0 && bounds.right <= root.width && bounds.top >= 0 && bounds.bottom <= root.height)
        assertTrue("Vertical text clipping: $label", text.layout.height <= text.height - text.compoundPaddingTop - text.compoundPaddingBottom)
        assertEquals("Hidden text: $label", text.text.length, text.layout.getLineEnd(text.layout.lineCount - 1))
      }
    }
  }
  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun cachedWidgetKeepsItsMeasuredTextUntilSizeAndFontCanRefreshTogether() {
    val cached = SessionWidget.views(context, state())
    val original = cached.apply(context, null)
    val config = android.content.res.Configuration(context.resources.configuration).apply { fontScale = 2f }
    val enlarged = context.createConfigurationContext(config)
    val restored = cached.apply(enlarged, null)
    val refreshed = SessionWidget.views(enlarged, state()).apply(enlarged, null)
    for (id in listOf(R.id.widget_lift, R.id.widget_amount, R.id.widget_add, R.id.widget_done)) {
      val originalSize = original.findViewById<TextView>(id).textSize
      assertEquals(originalSize, restored.findViewById<TextView>(id).textSize, 0.01f)
      assertTrue(refreshed.findViewById<TextView>(id).textSize > originalSize)
    }
  }
  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Test fun openIconIsCenteredInItsTouchTargetAtBothWidgetSizes() {
    for (strip in listOf(false, true)) for (scale in listOf(1f, 2f)) {
      val config = android.content.res.Configuration(context.resources.configuration).apply { fontScale = scale }
      val sized = context.createConfigurationContext(config)
      val density = sized.resources.displayMetrics.density
      val height = if (strip) 48f else SessionWidget.compactHeight(sized)
      val root = SessionWidget.views(sized, state(), compact = true, strip = strip).apply(sized, null)
      root.measure(View.MeasureSpec.makeMeasureSpec((180 * density).toInt(), View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
      root.layout(0, 0, root.measuredWidth, root.measuredHeight)
      val button = root.findViewById<android.widget.ImageButton>(R.id.widget_open)
      val icon = android.graphics.RectF(button.drawable.bounds)
      button.imageMatrix.mapRect(icon)
      icon.offset(button.paddingLeft.toFloat(), button.paddingTop.toFloat())
      assertEquals(button.width / 2f, icon.centerX(), 0.5f)
      assertEquals(button.height / 2f, icon.centerY(), 0.5f)
      assertEquals(24 * density, icon.width(), 1f)
      assertEquals(24 * density, icon.height(), 1f)
      assertTrue(button.width >= 48 * density && button.height >= 48 * density)
      assertEquals("Open session", button.contentDescription.toString())
    }
  }
  @org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
  @Config(qualifiers = "420dpi")
  @Test fun oneRowCardFillsTheLauncherMinimumWithoutGrowingTheSlot() {
    val density = context.resources.displayMetrics.density
    for (height in listOf(80, 96, 104, 120)) for (state in listOf(null, state())) {
      val root = SessionWidget.views(context, state, compact = true, fillCard = true).apply(context, null)
      root.measure(View.MeasureSpec.makeMeasureSpec((320 * density).toInt(), View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec((height * density).toInt(), View.MeasureSpec.EXACTLY))
      root.layout(0, 0, root.measuredWidth, root.measuredHeight)
      val card = root.findViewById<View>(R.id.widget_card)
      assertEquals(android.view.ViewGroup.LayoutParams.MATCH_PARENT, card.layoutParams.height)
      assertEquals(root.height, card.height)
      val open = root.findViewById<View>(R.id.widget_open)
      assertEquals(card.height / 2f, open.top + open.height / 2f, 0.5f)
      assertEquals((48 * density).toInt(), open.height)
      SessionWidget.views(context, state, compact = true).reapply(context, root)
      root.measure(View.MeasureSpec.makeMeasureSpec((320 * density).toInt(), View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec((340 * density).toInt(), View.MeasureSpec.EXACTLY))
      root.layout(0, 0, root.measuredWidth, root.measuredHeight)
      assertTrue("Expanding must release the filled height", card.height <= 80 * density)
    }
  }
}
