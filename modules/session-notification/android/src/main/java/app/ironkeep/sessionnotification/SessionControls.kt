package app.ironkeep.sessionnotification

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject
import java.util.UUID

/** Device-local presentation receipts, in the same transaction as the workout. Never exported. */
object SessionControls {
  const val KEY = "session-controls"

  fun observe(db: SQLiteDatabase, state: SessionState?, now: Long) {
    if (state == null) {
      db.delete("prefs", "key = ?", arrayOf(KEY))
      return
    }
    val stored = db.rawQuery("SELECT value FROM prefs WHERE key = ?", arrayOf(KEY)).use {
      if (it.moveToFirst()) runCatching { JSONObject(it.getString(0)) }.getOrNull() else null
    }
    val old = stored?.takeIf { it.optString("workout") == state.id }
    val before = old?.optJSONObject("sets")
    val previousTimes = old?.optJSONObject("times")
    val sets = JSONObject()
    val times = JSONObject()
    for (i in 0 until state.entries.length()) {
      val entry = state.entries.getJSONObject(i)
      val rows = entry.getJSONArray("sets")
      for (j in 0 until rows.length()) {
        val key = "${entry.optString("exerciseId", i.toString())}:$j"
        val done = rows.getJSONObject(j).getBoolean("done")
        sets.put(key, done)
        if (done) {
          val previous = previousTimes?.optLong(key, 0) ?: 0
          if (previous > 0) times.put(key, previous)
          else if (before?.has(key) == true && !before.getBoolean(key)) times.put(key, now)
        }
      }
    }
    val fingerprint = state.fingerprint()
    val changed = old == null || old.optString("fingerprint") != fingerprint
    state.controlToken = if (changed) UUID.randomUUID().toString() else old?.optString("nonce") ?: UUID.randomUUID().toString()
    state.lastCompletedAt = times.keys().asSequence().map { times.getLong(it) }.maxOrNull()
    if (changed) {
      val value = JSONObject().put("workout", state.id).put("fingerprint", fingerprint)
        .put("nonce", state.controlToken).put("sets", sets).put("times", times)
      val row = ContentValues().apply { put("key", KEY); put("value", value.toString()) }
      db.insertWithOnConflict("prefs", null, row, SQLiteDatabase.CONFLICT_REPLACE)
    }
  }
}
