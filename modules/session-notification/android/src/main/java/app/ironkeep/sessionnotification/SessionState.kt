package app.ironkeep.sessionnotification

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import kotlin.math.max
import kotlin.math.round

/** The stored web/mobile envelope stays unchanged. Only its existing fields are edited. */
data class SessionState(
  val id: String,
  val day: String,
  val startedAt: String,
  var pausedAt: String?,
  var pausedMs: Long,
  val entries: JSONArray,
  val settings: JSONObject,
  val notificationsEnabled: Boolean = true,
) {
  var controlToken: String = ""
  var lastCompletedAt: Long? = null

  val units: String get() = if (settings.optString("units") == "lb") "lb" else "kg"
  val total: Int get() = (0 until entries.length()).sumOf { entries.getJSONObject(it).getJSONArray("sets").length() }
  val done: Int get() = (0 until entries.length()).sumOf { i ->
    val sets = entries.getJSONObject(i).getJSONArray("sets")
    (0 until sets.length()).count { sets.getJSONObject(it).getBoolean("done") }
  }

  fun current(): Pair<JSONObject, Int>? {
    for (i in 0 until entries.length()) {
      val entry = entries.getJSONObject(i)
      val sets = entry.getJSONArray("sets")
      for (j in 0 until sets.length()) if (!sets.getJSONObject(j).getBoolean("done")) return entry to j
    }
    return null
  }

  fun token(): String = "${fingerprint()}|$controlToken"

  fun fingerprint(): String = MessageDigest.getInstance("SHA-256")
    .digest("$id|$startedAt|$pausedAt|$pausedMs|$entries|$settings".toByteArray())
    .joinToString("") { "%02x".format(it) }

  fun elapsed(now: Long): Long = max(0, (pausedAt?.let { SessionTime.parse(it) } ?: now) -
    SessionTime.parse(startedAt) - pausedMs)

  /** Same fallback order as lib/logic/sets.ts: own, this set's prefill, earlier set, floor. */
  fun value(entry: JSONObject, index: Int, key: String): Double {
    val sets = entry.getJSONArray("sets")
    fun number(obj: JSONObject?): Double? = if (obj == null || obj.isNull(key)) null else obj.getDouble(key)
    number(sets.getJSONObject(index))?.let { return it }
    number(entry.optJSONArray("prefill")?.optJSONObject(index))?.let { return it }
    for (i in index - 1 downTo 0) number(sets.getJSONObject(i))?.let { return it }
    return if (key == "weight") 0.0 else entry.getDouble("repMin")
  }

  /** Matches progression.ts, including paired plates and user-selected equipment steps. */
  fun weightStep(entry: JSONObject): Double {
    fun chosen(key: String, options: List<Double>, fallback: Double): Double {
      val n = settings.optDouble(key, fallback)
      return if (n in options) n else fallback
    }
    val lb = units == "lb"
    val plate = chosen("plate", if (lb) listOf(2.5, 5.0, 10.0) else listOf(1.25, 2.5, 5.0), 2.5)
    val equipment = entry.optString("equipment")
    if (equipment == "barbell" || entry.optBoolean("plateLoaded")) return plate * 2
    if (settings.optBoolean("sameStep")) return plate
    if (equipment == "dumbbell" || equipment == "kettlebell") {
      return chosen("dumbbellStep", if (lb) listOf(2.5, 5.0, 10.0) else listOf(2.0, 2.5, 5.0), if (lb) 5.0 else 2.5)
    }
    return chosen("stackStep", if (lb) listOf(5.0, 10.0, 15.0) else listOf(2.5, 5.0, 10.0), if (lb) 5.0 else 2.5)
  }

  /** Commands have an explicit target token; a repeated Done can never tick the following set. */
  fun apply(action: String, now: Long): Boolean {
    if (action == "pause") {
      if (pausedAt != null) return false
      pausedAt = SessionTime.format(now)
      return true
    }
    if (action == "resume") {
      val at = pausedAt ?: return false
      pausedMs += max(0, now - SessionTime.parse(at))
      pausedAt = null
      return true
    }
    if (pausedAt != null) return false
    val (entry, index) = current() ?: return false
    val set = entry.getJSONArray("sets").getJSONObject(index)
    val type = entry.getString("loadType")
    require(type in listOf("weight", "bodyweight", "time"))
    val amount = if (type == "time") "seconds" else "reps"
    when (action) {
      "add-set" -> {
        val rows = entry.getJSONArray("sets")
        val last = rows.getJSONObject(rows.length() - 1)
        val added = JSONObject().put("done", false)
        for (key in listOf("weight", "reps", "seconds")) {
          if (!last.isNull(key)) added.put(key, last.get(key))
        }
        rows.put(added)
      }
      "weight-minus", "weight-plus" -> {
        if (type != "weight") return false
        val delta = weightStep(entry) * if (action == "weight-minus") -1 else 1
        set.put("weight", round(max(0.0, value(entry, index, "weight") + delta) * 100) / 100)
      }
      "amount-minus", "amount-plus" -> {
        val delta = (if (type == "time") 5 else 1) * if (action == "amount-minus") -1 else 1
        set.put(amount, max(0.0, value(entry, index, amount) + delta))
      }
      "done" -> {
        if (type == "weight") {
          val weight = value(entry, index, "weight")
          if (weight <= 0) return false
          set.put("weight", weight)
        }
        set.put(amount, value(entry, index, amount))
        set.put("done", true)
      }
      else -> return false
    }
    return true
  }
}
