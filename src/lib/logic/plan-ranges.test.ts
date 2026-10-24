import { describe, expect, it } from '@jest/globals'
import { DAY_BLOCKS } from '@/lib/day-blocks'
import { LIBRARY } from '@/lib/library-data'
import { assertPlanRanges, assertRepRange } from '@/lib/logic/plan-ranges'
import { buildSplit, SPLITS } from '@/lib/splits'

describe('rep range validation', () => {
  it.each(SPLITS)('$name has valid plan ranges', ({ id }) => {
    expect(() => assertPlanRanges(buildSplit(id))).not.toThrow()
  })

  it('accepts all library and Add day ranges', () => {
    for (const exercise of LIBRARY) expect(() => assertRepRange(exercise)).not.toThrow()
    for (const make of Object.values(DAY_BLOCKS)) {
      for (const exercise of make()) expect(() => assertRepRange(exercise)).not.toThrow()
    }
  })

  it.each([
    [0, 10],
    [12, 10],
    [1, 601],
    [1.5, 10],
    [1, Number.NaN],
  ])('rejects invalid range %s–%s', (repMin, repMax) => {
    expect(() => assertRepRange({ repMin, repMax })).toThrow('rep range')
  })
})
