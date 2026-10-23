import type { Family } from '@/components/day-icon'
import { MUSCLE_FAMILY } from '@/features/stats/stats-model'
import { type PeriodKind, type Report, toneOf } from '@/lib/logic/report'
import { MUSCLE_LABEL } from '@/lib/logic/stats'
import { TREND_LABEL } from '@/lib/logic/trend'
import { fmtWeight } from '@/lib/logic/units'
import type { DayType, Muscle, Units, Workout } from '@/lib/types'

/*
 * What the Report page lists, worked out from a report. Pure, so it is tested without a screen.
 */

/** "kg, down 0.3", "kg, up 0.5", "kg, same": the bodyweight tile's caption. */
export function bodyweightCaption(report: Report, units: Units): string {
  const bw = report.bodyweight
  if (!bw) return 'bodyweight'
  if (bw.from === undefined) return units
  const d = Math.round((bw.to - bw.from) * 10) / 10
  const tone = toneOf(bw.to, bw.from)
  if (tone === 'same') return `${units}, same`
  return `${units}, ${tone === 'up' ? 'up' : 'down'} ${fmtWeight(Math.abs(d))}`
}

/** The day type each lift was last trained on, for its tile on a row. */
export function liftTypes(workouts: Workout[]): Map<string, DayType> {
  const out = new Map<string, DayType>()
  for (const w of workouts) for (const e of w.entries) out.set(e.exerciseId, w.dayType)
  return out
}

export interface AttentionRow {
  key: string
  title: string
  sub: string
  /** The tile's colour: a muscle's family, a lift's day, or none for a note on the period. */
  type?: DayType
  family?: Family
}

const ROUND = (n: number) => Math.round(n)

/** The rows under "Needs attention", in the web's order: muscles under target, stuck, slipping, too much, deload. */
export function attentionRows(
  report: Report,
  kind: PeriodKind,
  types: Map<string, DayType>,
  liftIds: Map<string, string>,
): AttentionRow[] {
  const { attention } = report
  const perWeek = kind === 'month' ? ' a week' : ''
  const rows: AttentionRow[] = attention.under.map((m) => ({
    key: `under:${m.muscle}`,
    title: MUSCLE_LABEL[m.muscle],
    sub: `${ROUND(m.perWeek)} of ${m.target} hard sets${perWeek}`,
    family: MUSCLE_FAMILY[m.muscle as Muscle],
  }))
  for (const name of attention.stuck)
    rows.push({ key: `stuck:${name}`, title: name, sub: TREND_LABEL.stuck, type: types.get(liftIds.get(name) ?? '') })
  for (const name of attention.slipping)
    rows.push({
      key: `slipping:${name}`,
      title: name,
      sub: TREND_LABEL.slipping,
      type: types.get(liftIds.get(name) ?? ''),
    })
  if (attention.tooMuch > 0)
    rows.push({
      key: 'tooMuch',
      title: 'Too much',
      sub: `${attention.tooMuch} ${attention.tooMuch === 1 ? 'session' : 'sessions'} rated Too much`,
    })
  if (attention.deload)
    rows.push({ key: 'deload', title: 'Deload week', sub: 'Two hard weeks with most lifts holding' })
  return rows
}

/** Each lift's id by name, from the sessions, so a name in the report finds its day. */
export function liftIdsByName(workouts: Workout[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const w of workouts) for (const e of w.entries) out.set(e.name, e.exerciseId)
  return out
}
