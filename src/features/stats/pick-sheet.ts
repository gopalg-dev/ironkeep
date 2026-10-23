import type { DayType } from '@/lib/types'

/** One choice on the pick sheet: a lift or a plan day, with a day tile when it has a type. */
export interface PickOption {
  id: string
  label: string
  type?: DayType
}

export interface Pick {
  title: string
  options: PickOption[]
  current: string | undefined
  onPick: (id: string) => void
}

/** What the `/pick` sheet shows: handed over by the screen that opens it, read once by the route. */
let pending: Pick | null = null

export const setPick = (p: Pick | null): void => {
  pending = p
}
export const getPick = (): Pick | null => pending
