import type { Equipment } from '../library'
import type { Exercise, LoggedSet, SetTarget, Units, WorkoutEntry } from '../types'
import { incrementFor, type Steps, startsAtBar } from './progression'
import { fmtWeight } from './units'

/**
 * What a lift shows when a session starts: what was done last time, and plain facts about its last sessions. Never a
 * target. The weight and the reps are the lifter's call; the app only says what happened.
 */

/** One earlier session of an exercise, newest first in a history, with how that session felt. */
export interface PastEntry {
  entry: WorkoutEntry
  /** 1 easy, 2 ok, 3 hard, 4 too much. */
  effort?: number
}

export interface LiftStart {
  /** Blank sets, one per planned set. Nothing is logged until the user marks a set done. */
  sets: LoggedSet[]
  /** What each set starts from, by index: last time's set. Shown as placeholders; logged when a set is ticked as is. */
  prefill?: SetTarget[]
  /** "Last time 60 kg × 8, 8, 7." and a fact or two. */
  hint?: string
}

/** The sessions read back for a lift: enough to say "same weight for 6 sessions". */
export const FACT_SESSIONS = 6
/** Sessions at one weight before the run is worth a line. */
export const SAME_WEIGHT_SESSIONS = 3
/** Sessions in a row of a bodyweight lift with every set under the range before its alternate is named. */
export const UNDER_SESSIONS = 3
/** A step over this share of the load is named at the top of the range: 10%, the top of the ACSM's band. */
const BIG_STEP = 0.1

function doneOf(entry: WorkoutEntry): LoggedSet[] {
  return entry.sets.filter((s) => s.done)
}

/** Last time's sets, one per planned set; sets past the last one done repeat it. */
function carried(done: LoggedSet[], n: number): SetTarget[] {
  return Array.from({ length: n }, (_, i) => {
    const s = done[Math.min(i, done.length - 1)]
    return {
      ...(s.weight !== undefined ? { weight: s.weight } : {}),
      ...(s.reps !== undefined ? { reps: s.reps } : {}),
      ...(s.seconds !== undefined ? { seconds: s.seconds } : {}),
    }
  })
}

const totalReps = (d: LoggedSet[]) => d.reduce((n, s) => n + (s.reps ?? 0), 0)
const topOf = (d: LoggedSet[]) => Math.max(...d.map((s) => s.weight ?? 0))

/**
 * How a lift starts today, from its last sessions (newest first): last time's sets to start from, and facts. Weight
 * lifts say whether every set reached the top of the range (with the size of the next step when it is over a tenth of
 * the load), how many sessions in a row sat at one weight and whether the reps climbed there, and a session rated too
 * much. A barbell lift's first session starts at the empty bar and says the bar counts.
 */
export function liftStart(
  exercise: Pick<Exercise, 'repMin' | 'repMax' | 'loadType'> & Partial<Pick<Exercise, 'alternates' | 'muscle'>>,
  targetSets: number,
  history: PastEntry[],
  units: Units,
  /** What the lift is done on, the gym's smallest steps and its empty bar (see `barOf`). */
  gym: { equipment?: Equipment; plateLoaded?: boolean; steps?: Steps; bar?: number } = {},
): LiftStart {
  const sets: LoggedSet[] = Array.from({ length: targetSets }, () => ({ done: false }))
  const past = history.filter((h) => doneOf(h.entry).length > 0)
  const last = past[0]
  if (!last) {
    // A barbell's weight is the whole bar: the first set starts at the empty bar, the ones after it follow the set
    // before, as blank sets do.
    const bar = exercise.loadType === 'weight' && startsAtBar(gym.equipment, exercise.muscle) ? gym.bar : undefined
    if (bar === undefined) return { sets }
    return {
      sets,
      prefill: sets.map((_, i) => (i === 0 ? { weight: bar } : {})),
      hint: `First session: log the whole weight, bar included. The empty bar is ${fmtWeight(bar, units)}.`,
    }
  }
  const done = doneOf(last.entry)
  const prefill = carried(done, targetSets)
  const allAtTop = (key: 'reps' | 'seconds') =>
    done.length >= targetSets && done.every((s) => (s[key] ?? 0) >= exercise.repMax)
  const tooMuch = last.effort === 4 ? ' Rated too much.' : ''

  if (exercise.loadType === 'weight') {
    const top = topOf(done)
    const reps = done.map((s) => s.reps ?? 0)
    // One weight across the sets reads "60 kg × 8, 8, 7"; a pyramid reads "10 × 12, 12.5 × 10, 15 kg × 8".
    const lastLine = done.every((s) => (s.weight ?? 0) === top)
      ? `Last time ${fmtWeight(top, units)} × ${reps.join(', ')}.`
      : `Last time ${done
          .map((s, i) => `${fmtWeight(s.weight, i === done.length - 1 ? units : undefined)} × ${s.reps ?? 0}`)
          .join(', ')}.`
    let fact = ''
    if (allAtTop('reps')) {
      fact = ' Top of the range on every set.'
      const inc = incrementFor(units, gym.equipment, gym.steps, gym.plateLoaded)
      if (top > 0 && inc > top * BIG_STEP) {
        fact += ` The next step, ${fmtWeight(top + inc, units)}, is ${Math.round((inc / top) * 100)}% more.`
      }
    } else {
      // The run of sessions at this weight, newest first, and whether the reps climbed along it.
      let run = 0
      while (run < past.length && topOf(doneOf(past[run].entry)) === top) run++
      if (run >= SAME_WEIGHT_SESSIONS) {
        const climbing = totalReps(done) > totalReps(doneOf(past[run - 1].entry))
        const n = `${run}${run === FACT_SESSIONS ? '+' : ''}`
        fact = climbing ? ` Same weight for ${n} sessions, reps climbing.` : ` Same weight for ${n} sessions.`
      }
    }
    return { sets, prefill, hint: `${lastLine}${fact}${tooMuch}` }
  }

  if (exercise.loadType === 'bodyweight') {
    const reps = done.map((s) => s.reps ?? 0)
    let fact = allAtTop('reps') ? ' Top of the range on every set.' : ''
    // Three sessions with every set under the range; the plan may hold an easier way to the same muscle.
    const under =
      past.length >= UNDER_SESSIONS &&
      past.slice(0, UNDER_SESSIONS).every((h) => doneOf(h.entry).every((s) => (s.reps ?? 0) < exercise.repMin))
    if (under) {
      const alternate = exercise.alternates?.[0]
      fact = ` Under ${exercise.repMin} for ${UNDER_SESSIONS} sessions.${alternate ? ` ${alternate} is its alternate on Plan.` : ''}`
    }
    return { sets, prefill, hint: `Last time ${reps.join(', ')}.${fact}${tooMuch}` }
  }

  const secs = done.map((s) => s.seconds ?? 0)
  const fact = allAtTop('seconds') ? ' Top of the range on every set.' : ''
  return { sets, prefill, hint: `Last time ${secs.join(', ')} s.${fact}${tooMuch}` }
}
