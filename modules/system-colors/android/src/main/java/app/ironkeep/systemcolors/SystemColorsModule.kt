package app.ironkeep.systemcolors

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The phone's own colours: the five tonal palettes Android 12 and up build from the wallpaper
 * (Material You), each at the thirteen tones the system publishes, as "#RRGGBB" strings. Older
 * phones get nothing, and the app keeps its own look.
 */
class SystemColorsModule : Module() {
  private val palettes = listOf("accent1", "accent2", "accent3", "neutral1", "neutral2")
  private val tones = listOf(0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)

  override fun definition() = ModuleDefinition {
    Name("SystemColors")

    Function("getPalettes") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function null
      val context = appContext.reactContext ?: return@Function null
      val out = mutableMapOf<String, Map<String, String>>()
      for (palette in palettes) {
        val shades = mutableMapOf<String, String>()
        for (tone in tones) {
          val id = context.resources.getIdentifier("system_${palette}_$tone", "color", "android")
          if (id == 0) continue
          val argb = context.getColor(id)
          shades[tone.toString()] = String.format("#%06X", 0xFFFFFF and argb)
        }
        out[palette] = shades
      }
      out
    }
  }
}
