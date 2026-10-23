import type { Backup } from '@/db/backup'
import type { ImportWarning } from '@/lib/logic/import'
import type { BodyweightLog, MeasurementLog, Workout } from '@/lib/types'

/** A file read in, on its way from the picker to the preview page. */
export type PendingImport =
  | { kind: 'backup'; name: string; backup: Backup }
  | {
      kind: 'logs'
      name: string
      layout: 'log' | 'tracker'
      workouts: Workout[]
      bodyweights: BodyweightLog[]
      measurements: MeasurementLog[]
      warnings: ImportWarning[]
    }

let pending: PendingImport | null = null

export function setImport(value: PendingImport | null): void {
  pending = value
}

export function getImport(): PendingImport | null {
  return pending
}
