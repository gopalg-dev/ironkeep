import { describe, expect, it } from '@jest/globals'
import { z } from 'zod'
import fixture from './__fixtures__/session-controls.json'
import { completeSet, currentSet } from './sets'

const numbers = z.object({ weight: z.number().optional(), reps: z.number().optional(), seconds: z.number().optional() })
const logged = numbers.extend({ done: z.boolean() })
const cases = z
  .array(
    z.object({
      name: z.string(),
      loadType: z.enum(['weight', 'bodyweight', 'time']),
      repMin: z.number(),
      prefill: z.array(numbers).optional(),
      sets: z.array(logged),
      expected: logged,
    }),
  )
  .parse(fixture)

describe('shared Android and TypeScript completion fixtures', () => {
  for (const sample of cases) {
    it(sample.name, () => {
      const index = currentSet(sample.sets)
      if (index === undefined) throw new Error('Fixture must have an unfinished set')
      expect(completeSet(sample, sample.sets, index)[index]).toEqual(sample.expected)
    })
  }
})
