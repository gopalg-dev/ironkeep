package app.ironkeep.sessionnotification

import android.content.Context
import java.io.File
import java.io.RandomAccessFile
import java.nio.channels.FileLock

/** Cross-process gate: Android and Expo use different SQLite libraries; never load both in one process. */
object SessionWriteGate {
  private var count = 0
  private var file: RandomAccessFile? = null
  private var lock: FileLock? = null

  @Synchronized fun begin(context: Context) {
    if (count == 0) {
      val opened = RandomAccessFile(File(context.filesDir, "session-control.lock"), "rw")
      try {
        lock = opened.channel.lock()
        file = opened
      } catch (error: Exception) {
        opened.close()
        throw error
      }
    }
    count++
  }

  @Synchronized fun end() {
    if (count == 0) return
    count--
    if (count == 0) {
      lock?.release()
      file?.close()
      lock = null
      file = null
    }
  }

  fun tryAction(context: Context, action: () -> Unit) {
    RandomAccessFile(File(context.filesDir, "session-control.lock"), "rw").use { opened ->
      val acquired = opened.channel.tryLock() ?: return
      try { action() } finally { acquired.release() }
    }
  }
}
