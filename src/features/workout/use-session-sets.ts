import { useEffect, useRef, useState } from 'react'

import { completeSet } from '@/lib/logic/sets'
import type { LoggedSet, WorkoutEntry } from '@/lib/types'

/** Where a change to an exercise's sets goes: saved at once (a tick) or soon after (a number being stepped). */
export type SaveSets = (exerciseId: string, sets: LoggedSet[], immediate: boolean) => void

type Update = WorkoutEntry[] | ((current: WorkoutEntry[]) => WorkoutEntry[])

/**
 * A session's sets as the lifter works through them: the numbers, the ticks, a set added or dropped,
 * and which exercise is open. Every change goes out through `save`. When the stored session changes
 * from outside (a swap, a ramp, a reload), `initial` changes and the state follows it. Changes work
 * from the latest value, not the render's, so two quick taps never overwrite each other.
 */
export function useSessionSets(initial: WorkoutEntry[], save: SaveSets) {
  const [entries, setEntriesState] = useState<WorkoutEntry[]>(initial)
  const latest = useRef(entries)
  const [openId, setOpenId] = useState<string | null>(
    () => initial.find((e) => e.sets.some((s) => !s.done))?.exerciseId ?? null,
  )
  useEffect(() => {
    latest.current = initial
    setEntriesState(initial)
  }, [initial])

  function setEntries(update: Update) {
    const next = typeof update === 'function' ? update(latest.current) : update
    latest.current = next
    setEntriesState(next)
  }

  function updateSets(exerciseId: string, mutate: (sets: LoggedSet[]) => LoggedSet[], immediate = false) {
    const next = latest.current.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: mutate(e.sets) } : e))
    setEntries(next)
    const entry = next.find((e) => e.exerciseId === exerciseId)
    if (entry) save(exerciseId, entry.sets, immediate)
  }

  /** Opens the next exercise with something left to do, once this one is finished with. */
  function advanceFrom(exerciseId: string) {
    const following = latest.current.find((e) => e.exerciseId !== exerciseId && e.sets.some((s) => !s.done))
    setOpenId(following?.exerciseId ?? null)
  }

  function changeSet(exerciseId: string, index: number, patch: Partial<LoggedSet>) {
    updateSets(exerciseId, (sets) => sets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    // The reps-left answer on the last set is the last thing to do on a weight exercise.
    const entry = latest.current.find((e) => e.exerciseId === exerciseId)
    if (patch.left !== undefined && entry?.sets.every((s) => s.done)) advanceFrom(exerciseId)
  }

  function toggleDone(exerciseId: string, index: number) {
    const entry = latest.current.find((e) => e.exerciseId === exerciseId)
    const at = entry?.sets[index]
    if (!entry || !at) return
    const nowDone = !at.done
    updateSets(exerciseId, (sets) => completeSet(entry, sets, index), true)
    if (!nowDone) return
    const allDone = entry.sets.every((s, i) => i === index || s.done)
    // A weight exercise stays open after its last set so the reps-left question can be answered.
    if (allDone && entry.loadType !== 'weight') advanceFrom(exerciseId)
  }

  function addSet(exerciseId: string) {
    updateSets(exerciseId, (sets) => {
      const last = sets[sets.length - 1]
      return [...sets, { ...last, done: false }]
    })
  }

  /** Drops the last set: while it is still open, or once every set is logged and all are in view. */
  function removeSet(exerciseId: string) {
    updateSets(
      exerciseId,
      (sets) => {
        const last = sets[sets.length - 1]
        const allDone = sets.every((s) => s.done)
        return sets.length > 1 && (!last?.done || allDone) ? sets.slice(0, -1) : sets
      },
      true,
    )
  }

  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  return { entries, setEntries, openId, setOpenId, changeSet, toggleDone, addSet, removeSet, doneSets, totalSets }
}

export type SessionSets = ReturnType<typeof useSessionSets>
