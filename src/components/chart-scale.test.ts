import { describe, expect, it } from '@jest/globals'

import { axisTicks, niceStep } from './chart-scale'

describe('niceStep', () => {
  it('rounds a raw step to 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(0.8)).toBe(1)
    expect(niceStep(1.7)).toBe(2)
    expect(niceStep(2.3)).toBe(2.5)
    expect(niceStep(4)).toBe(5)
    expect(niceStep(7)).toBe(10)
    expect(niceStep(33)).toBe(50)
    expect(niceStep(0)).toBe(1)
  })
})

describe('axisTicks', () => {
  it('covers the data with a few round ticks', () => {
    expect(axisTicks(52.5, 62.5)).toEqual([50, 55, 60, 65])
    expect(axisTicks(73.4, 75.1)).toEqual([73, 74, 75, 76])
    expect(axisTicks(9, 12)).toEqual([8, 10, 12])
    expect(axisTicks(900, 2552)).toEqual([0, 1000, 2000, 3000])
  })

  it('puts a lone value between two ticks', () => {
    expect(axisTicks(78, 78)).toEqual([76, 78, 80])
    expect(axisTicks(36, 36)).toEqual([35, 36, 37])
  })
})
