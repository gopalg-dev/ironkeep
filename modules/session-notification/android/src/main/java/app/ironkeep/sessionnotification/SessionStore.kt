package app.ironkeep.sessionnotification

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** Native taps use the same SQLite file as Expo, with one short transaction and no background service. */
class SessionStore(private val file: File) {
  fun transact(action: String? = null, id: String? = null, token: String? = null, now: Long = System.currentTimeMillis()): SessionState? {
    if (!file.isFile) return null // Never create a second empty database or run migrations here.
    return SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.ENABLE_WRITE_AHEAD_LOGGING).use { db ->
      db.beginTransactionNonExclusive()
      try {
        val state = read(db)
        SessionControls.observe(db, state, now)
        if (state != null && action != null && state.id == id && state.token() == token && state.apply(action, now)) {
          val patch = ContentValues().apply {
            put("entries", state.entries.toString())
            put("paused_at", state.pausedAt)
            put("paused_ms", state.pausedMs)
          }
          db.update("workouts", patch, "id = ? AND status = 'in_progress'", arrayOf(state.id))
          SessionControls.observe(db, state, now)
        }
        db.setTransactionSuccessful()
        state
      } finally {
        db.endTransaction()
      }
    }
  }

  private fun read(db: SQLiteDatabase): SessionState? {
    val settings = db.rawQuery("SELECT value FROM settings WHERE id = 1", null).use {
      if (it.moveToFirst()) JSONObject(it.getString(0)) else JSONObject()
    }
    return db.rawQuery(
      "SELECT id, day_name, started_at, paused_at, paused_ms, entries FROM workouts WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 1", null,
    ).use {
      if (!it.moveToFirst()) null else SessionState(
        it.getString(0), it.getString(1), it.getString(2), if (it.isNull(3)) null else it.getString(3),
        if (it.isNull(4)) 0 else it.getLong(4), JSONArray(it.getString(5)), settings,
      )
    }
  }
}
