import type { LoadType } from './types'

const LOCALE = 'en-US'

/** The name an account goes by: the username, else the name, else the email (an emailed-link account has only that). */
export function accountName(user: { username?: string | null; name?: string | null; email: string }): string {
  return user.username ?? (user.name || user.email)
}

export function relativeDay(iso: string, now = new Date()): string {
  const a = new Date(now)
  a.setHours(0, 0, 0, 0)
  const b = new Date(iso)
  b.setHours(0, 0, 0, 0)
  const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff} days ago`
  return shortDate(iso)
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Thursday, Oct 22" */
export function weekdayDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(LOCALE, { weekday: 'long', month: 'short', day: 'numeric' })
}

/** "October 2026" */
export function monthYear(d: Date): string {
  return d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
}

export function signed(n: number, digits = 1): string {
  const s = n.toFixed(digits).replace(/\.0+$/, '')
  return n > 0 ? `+${s}` : s
}

/**
 * What to tell the user when a request fails: the error's own sentence, or the fallback when the
 * message is not one (a validator's JSON, an empty string, a non-Error).
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const m = err.message.trim()
  if (!m || m.startsWith('[') || m.startsWith('{')) return fallback
  return m
}

/** What each load type is called on screen. */
export const LOAD_LABEL: Record<LoadType, string> = { weight: 'Weighted', bodyweight: 'Bodyweight', time: 'Timed hold' }

/** The rep target of a lift as the plan writes it: "6–12", "8" for a fixed count, "30 s" for a hold. */
export function targetOf(e: { repMin: number; repMax: number; loadType: string }): string {
  const range = e.repMin === e.repMax ? `${e.repMin}` : `${e.repMin}–${e.repMax}`
  return e.loadType === 'time' ? `${range} s` : range
}
