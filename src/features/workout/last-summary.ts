import type { SessionSummary } from '@/lib/logic/summary'

/** What the summary sheet shows: handed over by the finish sheet, read once by the summary route. */
export interface LastSummary {
  summary: SessionSummary
  minutes: number
}

let last: LastSummary | null = null

export const setLastSummary = (s: LastSummary | null): void => {
  last = s
}
export const getLastSummary = (): LastSummary | null => last
