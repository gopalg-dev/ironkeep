import { addDatabaseChangeListener } from 'expo-sqlite'
import { useEffect } from 'react'
import { AppState } from 'react-native'

import { sessionNotification } from '../../../modules/session-notification'

/** One subscription at the database gate: event-driven updates, never a polling timer. */
export function useSessionNotifications(ready: boolean): void {
  useEffect(() => {
    if (!ready || !sessionNotification) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let running = false
    let again = false
    async function refresh() {
      if (running) {
        again = true
        return
      }
      running = true
      try {
        do {
          again = false
          if (disposed) return
          await sessionNotification?.refresh()
        } while (again && !disposed)
      } catch (error) {
        // A notification failure cannot block a workout or leave stale actionable controls behind.
        console.warn('Active workout notification could not update', error)
        sessionNotification?.cancel()
      } finally {
        running = false
      }
    }
    function schedule() {
      clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 100)
    }
    const writes = addDatabaseChangeListener((event) => {
      if (event.tableName === 'workouts' || event.tableName === 'settings' || event.tableName === 'prefs') schedule()
    })
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') schedule()
    })
    const native = sessionNotification.addListener('onSessionChanged', schedule)
    void refresh()
    return () => {
      disposed = true
      clearTimeout(timer)
      writes.remove()
      state.remove()
      native.remove()
    }
  }, [ready])
}

/** Native SQLite writes do not emit expo-sqlite events; reload mounted screens on a native tap/resume. */
export function useNativeSessionChanges(reload: () => undefined | (() => void)): void {
  useEffect(() => {
    let clean: undefined | (() => void)
    const trigger = () => {
      clean?.()
      clean = reload()
    }
    const native = sessionNotification?.addListener('onSessionChanged', trigger)
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') trigger()
    })
    return () => {
      native?.remove()
      state.remove()
      clean?.()
    }
  }, [reload])
}
