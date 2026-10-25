package app.ironkeep.sessionnotification

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** ISO timestamps without java.time (the app still supports Android 7 / API 24). */
object SessionTime {
  private fun formatter() = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
    isLenient = false
  }

  fun parse(value: String): Long {
    val match = Regex("^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})(?:\\.(\\d{1,9}))?(Z|[+-]\\d{2}:\\d{2})$").matchEntire(value)
      ?: error("Invalid session timestamp")
    val normalized = "${match.groupValues[1]}.${match.groupValues[2].padEnd(3, '0').take(3)}${match.groupValues[3]}"
    val position = ParsePosition(0)
    val date = formatter().parse(normalized, position) ?: error("Invalid session date")
    require(position.index == normalized.length)
    return date.time
  }

  fun format(value: Long): String = formatter().format(Date(value))
}
