/*
 * The value axis of a line chart: a few round ticks that cover the data, as Recharts draws it on the
 * web. Pure, so it is tested on its own.
 */

/** A round step near `raw`: 1, 2, 2.5 or 5 times a power of ten. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const base = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return base * pow
}

/**
 * Round ticks from just under the lowest value to just over the highest, about `count` of them. One
 * value alone (or all the same) gets a tick either side of it, so it sits mid-chart.
 */
export function axisTicks(min: number, max: number, count = 3): number[] {
  if (!(max > min)) {
    const step = niceStep(Math.max(Math.abs(min) * 0.02, 1))
    return [round(min - step, step), min, round(min + step, step)]
  }
  const step = niceStep((max - min) / Math.max(1, count - 1))
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round(v, step))
  return ticks
}

/** Keeps a tick clean of floating-point dust: 62.5, not 62.50000000000001. */
function round(v: number, step: number): number {
  const digits = Math.max(0, Math.ceil(-Math.log10(step)) + 1)
  return Number(v.toFixed(digits))
}
