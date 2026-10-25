package app.ironkeep.sessionnotification

import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [24, 35], manifest = Config.NONE)
class SessionStoreTest {
  private lateinit var file: File
  private lateinit var store: SessionStore
  private val now = 1792922400000L

  @Before fun setup() {
    file = File.createTempFile("ironkeep-notification", ".db")
    SQLiteDatabase.openOrCreateDatabase(file, null).use { db ->
      db.execSQL("CREATE TABLE prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
      db.execSQL("CREATE TABLE settings (id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
      db.execSQL("INSERT INTO settings VALUES (1, '{\"units\":\"kg\"}')")
      db.execSQL("CREATE TABLE workouts (id TEXT PRIMARY KEY, day_name TEXT, started_at TEXT, paused_at TEXT, paused_ms INTEGER, entries TEXT, status TEXT)")
      db.execSQL("INSERT INTO workouts VALUES ('w', 'Push', '2026-10-25T09:00:00.000Z', NULL, 0, ?, 'in_progress')", arrayOf(entries()))
    }
    store = SessionStore(file)
  }

  @After fun cleanup() { file.delete(); File(file.path + "-wal").delete(); File(file.path + "-shm").delete() }

  private fun entries() = """[
    {"exerciseId":"bench","name":"Bench press","loadType":"weight","repMin":8,"equipment":"barbell","prefill":[{"weight":60,"reps":10}],"sets":[{"done":false},{"done":false}]},
    {"exerciseId":"plank","name":"Plank","loadType":"time","repMin":30,"sets":[{"done":false}]}
  ]""".trimIndent()

  private fun read() = requireNotNull(store.transact())
  private fun act(command: String, time: Long = now): SessionState {
    val state = read()
    return requireNotNull(store.transact(command, state.id, state.token(), time))
  }

  @Test fun editsAndCompletesEachSetThenAdvancesToNextExercise() {
    assertEquals(65.0, act("weight-plus").current()?.let { it.first.getJSONArray("sets").getJSONObject(0).getDouble("weight") })
    act("amount-minus")
    val done = act("done")
    assertEquals(1, done.done)
    assertEquals(1, done.current()?.second)
    assertEquals(65.0, done.value(requireNotNull(done.current()).first, 1, "weight"), 0.0)
    act("done")
    assertEquals("Plank", read().current()?.first?.getString("name"))
    act("amount-plus")
    assertEquals(3, act("done").done)
    assertNull(read().current())
    // Finishing is deliberately a review route, never a silent receiver write.
    assertNotNull(store.transact("finish", "w", read().token(), now))
  }

  @Test fun duplicateAndStaleCommandsCannotCompleteTheNextSet() {
    val first = read()
    store.transact("done", first.id, first.token(), now)
    store.transact("done", first.id, first.token(), now)
    assertEquals(1, read().done)
    store.transact("weight-plus", "another-workout", read().token(), now)
    assertEquals(1, read().done)
  }

  @Test fun pauseAndResumeArePersistentAndExcludePausedTime() {
    val before = read().elapsed(now)
    act("pause")
    act("done")
    assertEquals(0, read().done)
    assertEquals(before, read().elapsed(now + 90000))
    val resumed = act("resume", now + 90000)
    assertNull(resumed.pausedAt)
    assertEquals(90000L, resumed.pausedMs)
    assertEquals(before, resumed.elapsed(now + 90000))
  }

  @Test fun finishedOrDeletedSessionsRejectOldActions() {
    val state = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET status = 'done'")
    }
    assertNull(store.transact("done", state.id, state.token(), now))
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { it.execSQL("DELETE FROM workouts") }
    assertNull(store.transact("resume", state.id, state.token(), now))
  }

  @Test fun restoredOrEditedDataInvalidatesAnOldButton() {
    val state = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET entries = ?", arrayOf(entries().replace("60", "80")))
    }
    store.transact("done", state.id, state.token(), now)
    assertEquals(0, read().done)
  }

  @Test fun missingDatabaseIsNotCreated() {
    val missing = File(file.parentFile, "missing-${file.name}")
    assertNull(SessionStore(missing).transact())
    assertFalse(missing.exists())
  }

  @Test fun weightWithoutAValueCannotBeCompletedAndDecrementsClampAtZero() {
    val state = SessionState("x", "Push", "2026-10-25T09:00:00Z", null, 0,
      JSONArray("""[{"name":"Curl","loadType":"weight","repMin":8,"sets":[{"done":false}]}]"""), JSONObject())
    assertFalse(state.apply("done", now))
    state.apply("weight-minus", now)
    assertEquals(0.0, state.value(requireNotNull(state.current()).first, 0, "weight"), 0.0)
    state.apply("weight-plus", now)
    assertTrue(state.apply("done", now))
  }

  @Test fun equipmentStepsMatchTheAppSettings() {
    val state = read()
    val entry = requireNotNull(state.current()).first
    state.settings.put("plate", 1.25)
    assertEquals(2.5, state.weightStep(entry), 0.0)
    entry.put("equipment", "dumbbell")
    state.settings.put("dumbbellStep", 2)
    assertEquals(2.0, state.weightStep(entry), 0.0)
    state.settings.put("sameStep", true)
    assertEquals(1.25, state.weightStep(entry), 0.0)
  }
  @Test fun anExtraSetIsPersistentAndDuplicateTapsAddOnlyOne() {
    val state = read()
    store.transact("add-set", state.id, state.token(), now)
    store.transact("add-set", state.id, state.token(), now)
    val fresh = requireNotNull(SessionStore(file).transact())
    assertEquals(4, fresh.total)
    assertEquals(0, fresh.done)
    assertEquals(3, fresh.entries.getJSONObject(0).getJSONArray("sets").length())
    assertEquals(1, fresh.entries.getJSONObject(1).getJSONArray("sets").length())
  }

  @Test fun extraSetCopiesOnlyNumbersAndNeverCompletionOrEffort() {
    val state = read()
    val rows = state.entries.getJSONObject(0).getJSONArray("sets")
    rows.getJSONObject(1).put("weight", 65).put("reps", 11).put("done", true).put("left", 2)
    assertTrue(state.apply("add-set", now))
    val added = rows.getJSONObject(2)
    assertEquals(65.0, added.getDouble("weight"), 0.0)
    assertEquals(11, added.getInt("reps"))
    assertFalse(added.getBoolean("done"))
    assertFalse(added.has("left"))
  }

  @Test fun returningToTheSameNumbersDoesNotReviveAnOldButton() {
    act("weight-plus") // Make the weight explicit, so both content fingerprints really match.
    val old = read()
    act("weight-plus")
    act("weight-minus")
    assertEquals(old.fingerprint(), read().fingerprint())
    assertNotEquals(old.token(), read().token())
    store.transact("done", old.id, old.token(), now)
    assertEquals(0, read().done)
  }

  @Test fun completionClockSurvivesColdReadsAndUndoRestoresTheEarlierClock() {
    assertNull(read().lastCompletedAt)
    assertEquals(now, act("done").lastCompletedAt)
    assertEquals(now, requireNotNull(SessionStore(file).transact()).lastCompletedAt)
    assertEquals(now + 60000, act("done", now + 60000).lastCompletedAt)
    val entries = read().entries
    entries.getJSONObject(0).getJSONArray("sets").getJSONObject(1).put("done", false)
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET entries = ?", arrayOf(entries.toString()))
    }
    assertEquals(now, read().lastCompletedAt)
    entries.getJSONObject(0).getJSONArray("sets").getJSONObject(0).put("done", false)
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET entries = ?", arrayOf(entries.toString()))
    }
    assertNull(read().lastCompletedAt)
  }

  @Test fun restoredCompletionsDoNotInventARecentCompletionTime() {
    val entries = JSONArray(entries())
    entries.getJSONObject(0).getJSONArray("sets").getJSONObject(0).put("done", true)
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET entries = ?", arrayOf(entries.toString()))
    }
    assertEquals(1, read().done)
    assertNull(read().lastCompletedAt)
  }

  @Test fun pausedSessionsRejectAllSetEdits() {
    val paused = act("pause")
    for (command in listOf("add-set", "weight-plus", "amount-plus", "done")) {
      val result = requireNotNull(store.transact(command, paused.id, paused.token(), now))
      assertEquals(paused.entries.toString(), result.entries.toString())
      assertEquals(paused.token(), result.token())
    }
  }

  @Test fun completionMatchesTheSharedTypeScriptFixtures() {
    val json = requireNotNull(javaClass.classLoader?.getResourceAsStream("session-controls.json")).bufferedReader().use { it.readText() }
    val samples = JSONArray(json)
    for (i in 0 until samples.length()) {
      val sample = samples.getJSONObject(i)
      val name = sample.getString("name")
      val state = SessionState("w", "Sample", "2026-10-25T09:00:00Z", null, 0,
        JSONArray().put(sample), JSONObject())
      val index = requireNotNull(state.current()).second
      state.apply("done", now)
      val actual = sample.getJSONArray("sets").getJSONObject(index)
      val expected = sample.getJSONObject("expected")
      assertEquals(name, expected.keys().asSequence().toSet(), actual.keys().asSequence().toSet())
      assertEquals(name, expected.getBoolean("done"), actual.getBoolean("done"))
      for (key in listOf("weight", "reps", "seconds")) {
        if (expected.has(key)) assertEquals(name, expected.getDouble(key), actual.getDouble(key), 0.0)
      }
    }
  }

  @Test fun competingWidgetSnapshotsCanCompleteOnlyOneSet() {
    val initial = read()
    val gate = java.util.concurrent.CountDownLatch(1)
    val pool = java.util.concurrent.Executors.newFixedThreadPool(2)
    try {
      val results = (0..1).map {
        pool.submit<SessionState?> {
          gate.await()
          SessionStore(file).transact("done", initial.id, initial.token(), now)
        }
      }
      gate.countDown()
      results.forEach { it.get(10, java.util.concurrent.TimeUnit.SECONDS) }
      assertEquals(1, read().done)
      assertEquals(1, read().current()?.second)
    } finally { pool.shutdownNow() }
  }

  @Test fun failedWorkoutWriteRollsBackNumbersAndControlReceipt() {
    val before = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("CREATE TRIGGER fail_workout BEFORE UPDATE ON workouts BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END")
    }
    assertThrows(android.database.SQLException::class.java) {
      store.transact("done", before.id, before.token(), now)
    }
    val after = read()
    assertEquals(before.entries.toString(), after.entries.toString())
    assertEquals(before.token(), after.token())
    assertNull(after.lastCompletedAt)
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { it.execSQL("DROP TRIGGER fail_workout") }
    assertEquals(1, act("done").done)
  }

  @Test fun partiallyMigratedSchemaIsNotChangedByAWidgetTap() {
    val before = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("ALTER TABLE workouts RENAME TO workouts_migrating")
    }
    assertThrows(android.database.SQLException::class.java) {
      store.transact("done", before.id, before.token(), now)
    }
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { db ->
      db.rawQuery("SELECT entries FROM workouts_migrating", null).use {
        assertTrue(it.moveToFirst())
        assertEquals(entries(), it.getString(0))
      }
      db.execSQL("ALTER TABLE workouts_migrating RENAME TO workouts")
    }
    assertEquals(1, act("done").done)
  }

  @Test fun malformedSessionDoesNotOverwriteDataAndRecoversAfterRepair() {
    val before = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("UPDATE workouts SET entries = 'not-json'")
    }
    assertThrows(org.json.JSONException::class.java) { store.transact("done", before.id, before.token(), now) }
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { db ->
      db.rawQuery("SELECT entries FROM workouts", null).use {
        assertTrue(it.moveToFirst()); assertEquals("not-json", it.getString(0))
      }
      db.execSQL("UPDATE workouts SET entries = ?", arrayOf(before.entries.toString()))
    }
    assertEquals(0, read().done)
    assertEquals(1, act("done").done)
  }

  @Test fun restoringIdenticalWorkoutWithoutReceiptsInvalidatesOldWidgetButtons() {
    val old = read()
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use {
      it.execSQL("DELETE FROM prefs WHERE key = 'session-controls'")
    }
    val restored = requireNotNull(store.transact("done", old.id, old.token(), now))
    assertEquals(0, restored.done)
    assertNotEquals(old.token(), restored.token())
    assertEquals(1, act("done").done)
  }
}
