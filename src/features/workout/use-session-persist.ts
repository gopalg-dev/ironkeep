import { useEffect } from 'react'
import { Alert, AppState } from 'react-native'
import * as repo from '@/db/repo'
import type { LoggedSet } from '@/lib/types'
import { sessionNotification } from '../../../modules/session-notification'
import { SessionWriteQueue } from './session-write-queue'

const writes = new SessionWriteQueue(
  () => sessionNotification?.beginWrite(),
  () => {
    sessionNotification?.endWrite()
  },
  () => Alert.alert('Set was not saved', 'Reopen the workout to check its saved values.'),
)

/**
 * Where a session's changes go: a tick is written at once, a stepped number 500 ms after the last
 * step, and `flush` writes whatever is still waiting before anything reads the stored session (a
 * ramp, a swap, Finish).
 */
export function useSessionPersist(workoutId: string) {
  useEffect(() => {
    const state = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void writes.flush(`${workoutId}:`).catch(() => undefined)
    })
    return () => {
      state.remove()
      void writes.flush(`${workoutId}:`).catch(() => undefined)
    }
  }, [workoutId])

  function persist(exerciseId: string, sets: LoggedSet[], immediate: boolean) {
    writes.save(`${workoutId}:${exerciseId}`, () => repo.saveEntrySets(workoutId, exerciseId, sets), immediate)
  }

  async function flush() {
    await writes.flush(`${workoutId}:`)
  }

  return { persist, flush }
}
