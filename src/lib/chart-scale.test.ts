import { describe, expect, it } from '@jest/globals'
import { axisDate, axisNumber, CHART_DAY, chartDay, chartPosition, timeAxis, valueAxis } from './chart-scale'

describe('chart axes', () => {
  it('uses equal readable value intervals covering the entire series', () => {
    for (const values of [[73.4, 75.1], [0, 36], [-4, 8], [0.01, 0.019], [1000, 2552], [78, 78], [0], []]) {
      const axis = valueAxis(values)
      expect(axis.domain[1]).toBeGreaterThan(axis.domain[0])
      expect(axis.ticks.every(Number.isFinite)).toBe(true)
      expect(new Set(axis.ticks.map((v) => axisNumber(v, axis.step))).size).toBe(axis.ticks.length)
      for (let i = 1; i < axis.ticks.length; i++) expect(axis.ticks[i] - axis.ticks[i - 1]).toBeCloseTo(axis.step)
      for (const value of values) {
        expect(value).toBeGreaterThanOrEqual(axis.domain[0])
        expect(value).toBeLessThanOrEqual(axis.domain[1])
      }
    }
  })
  it('keeps counts integral and bar comparisons on a zero baseline', () => {
    expect(valueAxis([1, 3], 1, true).domain[0]).toBe(0)
    expect(valueAxis([1, 3], 1, true).ticks.every(Number.isInteger)).toBe(true)
    expect(valueAxis([0, 0], 1, true).domain).toEqual([0, 1])
  })
  it('positions sparse observations by elapsed days and preserves the selected window', () => {
    const first = chartDay('2026-10-01T12:00:00')
    const last = chartDay('2026-10-29T12:00:00')
    const axis = timeAxis([first + CHART_DAY, last - CHART_DAY], first, last)
    expect(axis.domain).toEqual([first, last])
    expect(chartPosition(first + 7 * CHART_DAY, axis.domain, [0, 280])).toBe(70)
    expect(axis.ticks.length).toBeGreaterThan(1)
    for (let i = 1; i < axis.ticks.length; i++) expect(axis.ticks[i] - axis.ticks[i - 1]).toBe(14 * CHART_DAY)
  })
  it('uses calendar month boundaries, including leap years and missing months', () => {
    const axis = timeAxis([], Date.UTC(2024, 0, 1), Date.UTC(2024, 3, 1), 5)
    expect(axis.ticks).toEqual([0, 1, 2, 3].map((month) => Date.UTC(2024, month, 1)))
    expect(axis.ticks[2] - axis.ticks[1]).toBe(29 * CHART_DAY)
  })
  it('handles flat, single, invalid and unsorted inputs without degenerate scales', () => {
    const day = Date.UTC(2026, 9, 1)
    expect(timeAxis([day]).domain).toEqual([day - CHART_DAY, day + CHART_DAY])
    expect(timeAxis([day + CHART_DAY, Number.NaN, day]).domain).toEqual([day, day + CHART_DAY])
    expect(valueAxis([Number.NaN, Number.POSITIVE_INFINITY]).domain).toEqual([0, 1])
    expect(axisDate(Date.UTC(2026, 0, 1), [Date.UTC(2025, 11, 1), Date.UTC(2026, 1, 1)])).toContain('26')
  })
})
