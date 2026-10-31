/** Shared by the web and native charts. Dates represent local calendar days on a UTC day scale,
 * so a missed week occupies its real space and daylight saving cannot stretch a day. */
export const CHART_DAY = 86_400_000

export function chartDay(value: string | Date): number {
  const date = new Date(value)
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

export interface NumericAxis {
  domain: [number, number]
  ticks: number[]
  step: number
}

/** Round steps and a fixed domain for the complete visible series, independent of selection. */
export function valueAxis(values: number[], minimumStep = 0, zero = false, count = 5): NumericAxis {
  const finite = values.filter(Number.isFinite)
  let min = finite.length ? Math.min(...finite) : 0
  let max = finite.length ? Math.max(...finite) : 1
  if (zero) min = Math.min(0, min)
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.02, minimumStep, 1)
    min = zero ? 0 : min - pad
    max += pad
  }
  const raw = Math.max((max - min) / Math.max(1, count - 1), minimumStep, Number.EPSILON)
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
  const lo = Math.floor(min / step)
  const hi = Math.ceil(max / step)
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => Number(((lo + i) * step).toPrecision(12)))
  return { domain: [ticks[0] ?? 0, ticks.at(-1) ?? 1], ticks, step }
}

export function axisNumber(value: number, step: number): string {
  const digits = Math.max(0, Math.min(8, -Math.floor(Math.log10(step))))
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function axisLabelWidth(axis: NumericAxis, fontSize = 12): number {
  return Math.max(40, ...axis.ticks.map((t) => axisNumber(t, axis.step).length * fontSize * 0.58 + 10))
}

export interface TimeAxis {
  domain: [number, number]
  ticks: number[]
}

/** Calendar intervals, rather than the first/last data labels or the observation's array index. */
export function timeAxis(times: number[], start?: number, end?: number, count = 4): TimeAxis {
  const finite = times.filter(Number.isFinite)
  let min = start ?? (finite.length ? Math.min(...finite) : 0)
  let max = end ?? (finite.length ? Math.max(...finite) : min + CHART_DAY)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { domain: [0, CHART_DAY], ticks: [0, CHART_DAY] }
  if (max <= min) {
    min -= CHART_DAY
    max = min + 2 * CHART_DAY
  }
  const target = (max - min) / Math.max(1, count - 1)
  const intervals = [1, 2, 7, 14, 30, 90, 180, 365, 730, 1825]
  const days = intervals.find((n) => n * CHART_DAY >= target) ?? Math.ceil(target / (365 * CHART_DAY)) * 365
  const ticks: number[] = []
  if (days < 30) {
    const step = days * CHART_DAY
    // Weekly ticks start on Monday; other day ticks use the Unix epoch.
    const offset = days >= 7 ? 4 * CHART_DAY : 0
    for (let t = Math.ceil((min - offset) / step) * step + offset; t <= max; t += step) ticks.push(t)
  } else {
    const months = days < 365 ? Math.round(days / 30) : Math.round(days / 365) * 12
    const date = new Date(min)
    const firstMonth = date.getUTCFullYear() * 12 + date.getUTCMonth()
    let month = Math.floor(firstMonth / months) * months
    for (;;) {
      const t = Date.UTC(Math.floor(month / 12), month % 12, 1)
      if (t > max) break
      if (t >= min) ticks.push(t)
      month += months
    }
  }
  if (ticks.length < 2 && count < 64) return timeAxis(times, min, max, count * 2)
  return { domain: [min, max], ticks }
}

export function axisDate(value: number, domain: [number, number]): string {
  const span = domain[1] - domain[0]
  const crossesYear = new Date(domain[0]).getUTCFullYear() !== new Date(domain[1]).getUTCFullYear()
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    ...(span >= 5 * 365 * CHART_DAY
      ? { year: 'numeric' }
      : {
          month: 'short',
          ...(span < 180 * CHART_DAY ? { day: 'numeric' } : {}),
          ...(crossesYear ? { year: '2-digit' } : {}),
        }),
  })
}

export function chartPosition(value: number, domain: [number, number], range: [number, number]): number {
  return range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0])
}
