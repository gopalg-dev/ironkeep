import { useRef } from 'react'

import * as repo from '@/db/repo'
import type { LoggedSet, WorkoutEntry } from '@/lib/types'

/**
 * Where a session's changes go: a tick is written at once, a stepped number 500 ms after the last
 * step, and `flush` writes whatever is still waiting before anything reads the stored session (a
 * ramp, a swap, Finish). The caller keeps `latest` pointing at its current entries.
 */
export function useSessionPersist(workoutId: string) {
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const latest = useRef<WorkoutEntry[]>([])

  function persist(exerciseId: string, sets: LoggedSet[], immediate: boolean) {
    const existing = pending.current.get(exerciseId)
    if (existing) clearTimeout(existing)
    const run = () => {
      pending.current.delete(exerciseId)
      void repo.saveEntrySets(workoutId, exerciseId, sets)
    }
    if (immediate) run()
    else pending.current.set(exerciseId, setTimeout(run, 500))
  }

  async function flush() {
    const ids = [...pending.current.keys()]
    for (const id of ids) {
      clearTimeout(pending.current.get(id))
      pending.current.delete(id)
      const entry = latest.current.find((e) => e.exerciseId === id)
      if (entry) await repo.saveEntrySets(workoutId, id, entry.sets)
    }
  }

  return { persist, flush, latest }
}
