import { expect, it } from '@jest/globals'
import * as XLSX from 'xlsx'
import { readImport } from './read-file'

it('imports sessions, weigh-ins and unit-labelled tape sheets from the web workbook', async () => {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Date', 'Time', 'Day', 'Type', 'Exercise', 'Muscle', 'Set', 'Weight (kg)', 'Reps', 'Seconds', 'Effort', 'Note'],
      ['2026-10-12', '18:00', 'Push A', 'push', 'Barbell Bench Press', 'chest', 1, 60, 8, '', 'OK', ''],
    ]),
    'Sets',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Date', 'Weight (kg)'],
      ['2026-10-12', 72],
    ]),
    'Bodyweight',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Date', 'Arm (cm)', 'Chest (cm)', 'Waist (cm)'],
      ['2026-10-12', 35, 100, 80],
    ]),
    'Measurements',
  )
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
  const result = await readImport({ name: 'web.xlsx', bytes: async () => bytes, text: async () => '' })
  expect(result.kind).toBe('logs')
  if (result.kind !== 'logs') throw new Error('Expected spreadsheet logs')
  expect(result.workouts).toHaveLength(1)
  expect(result.bodyweights[0].weight).toBe(72)
  expect(result.measurements[0]).toMatchObject({ arm: 35, chest: 100, waist: 80 })
})
