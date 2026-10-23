import type { Period, PeriodDay, Report } from '@/lib/logic/report'
import type { Units } from '@/lib/types'

/** What the share sheet draws: handed over by the Report page, read once by the `/share` route. */
export interface ShareHandoff {
  report: Report
  period: Period
  days: PeriodDay[]
  units: Units
}

let pending: ShareHandoff | null = null

export const setShare = (s: ShareHandoff | null): void => {
  pending = s
}
export const getShare = (): ShareHandoff | null => pending
