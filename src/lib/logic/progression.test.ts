import { describe, expect, it } from '@jest/globals'
import { barOf, incrementFor, restSecondsFor, type Steps, stepsOf } from '@/lib/logic/progression'

describe('restSecondsFor', () => {
  it('gives big lifts longer rest', () => {
    expect(restSecondsFor({ repMax: 8, loadType: 'weight', muscle: 'chest' })).toBe(150)
    expect(restSecondsFor({ repMax: 15, loadType: 'weight', muscle: 'biceps' })).toBe(90)
    expect(restSecondsFor({ repMax: 45, loadType: 'time', muscle: 'abs' })).toBe(60)
  })
})

describe('incrementFor by equipment', () => {
  const kg = (s: Partial<Steps>) => ({ ...stepsOf({ units: 'kg' }), ...s })

  it('steps a barbell by two of the smallest plate', () => {
    expect(incrementFor('kg', 'barbell')).toBe(5)
    expect(incrementFor('kg', 'barbell', kg({ plates: 1.25 }))).toBe(2.5)
    expect(incrementFor('kg', 'barbell', kg({ plates: 5 }))).toBe(10)
    expect(incrementFor('lb', 'barbell')).toBe(5)
    expect(incrementFor('lb', 'barbell', { plates: 5, dumbbell: 5, stack: 5 })).toBe(10)
  })

  it('steps a plate-loaded machine like a barbell', () => {
    expect(incrementFor('kg', 'machine', kg({ plates: 1.25, stack: 10 }), true)).toBe(2.5)
  })

  it('steps a dumbbell by the rack step, whatever the plate', () => {
    expect(incrementFor('kg', 'dumbbell')).toBe(2.5)
    expect(incrementFor('kg', 'dumbbell', kg({ plates: 1.25, dumbbell: 2 }))).toBe(2)
    expect(incrementFor('kg', 'dumbbell', kg({ dumbbell: 5 }))).toBe(5)
    expect(incrementFor('lb', 'dumbbell')).toBe(5)
  })

  it('steps cables, pin machines and unknown lifts by the stack, upper or lower body', () => {
    expect(incrementFor('kg', 'cable')).toBe(2.5)
    expect(incrementFor('kg', 'machine', kg({ stack: 5 }))).toBe(5)
    expect(incrementFor('kg', undefined, kg({ stack: 10 }))).toBe(10)
    expect(incrementFor('lb', 'machine')).toBe(5)
  })
})

describe('stepsOf', () => {
  it("reads unset or foreign values as the unit's common ones", () => {
    expect(stepsOf({ units: 'kg' })).toEqual({ plates: 2.5, dumbbell: 2.5, stack: 2.5 })
    expect(stepsOf({ units: 'lb' })).toEqual({ plates: 2.5, dumbbell: 5, stack: 5 })
    expect(stepsOf({ units: 'kg', plate: 1.25, dumbbellStep: 2, stackStep: 5 })).toEqual({
      plates: 1.25,
      dumbbell: 2,
      stack: 5,
    })
    // 1.25 is no lb plate, 2 kg dumbbells no lb rack, 10 a stack step in both.
    expect(stepsOf({ units: 'lb', plate: 1.25, dumbbellStep: 2, stackStep: 10 })).toEqual({
      plates: 2.5,
      dumbbell: 5,
      stack: 10,
    })
  })

  it('puts the plate on every kind when the same is set for all', () => {
    expect(stepsOf({ units: 'kg', plate: 5, dumbbellStep: 2, stackStep: 10, sameStep: true })).toEqual({
      plates: 5,
      dumbbell: 5,
      stack: 5,
    })
    expect(stepsOf({ units: 'kg', sameStep: true })).toEqual({ plates: 2.5, dumbbell: 2.5, stack: 2.5 })
  })
})

describe('barOf', () => {
  it("reads unset or foreign values as the unit's Olympic bar", () => {
    expect(barOf({ units: 'kg' })).toBe(20)
    expect(barOf({ units: 'lb' })).toBe(45)
    expect(barOf({ units: 'kg', bar: 15 })).toBe(15)
    expect(barOf({ units: 'lb', bar: 35 })).toBe(35)
    // 15 is a kg bar and an lb bar; 20 kg is no lb bar.
    expect(barOf({ units: 'lb', bar: 15 })).toBe(15)
    expect(barOf({ units: 'lb', bar: 20 })).toBe(45)
  })
})
