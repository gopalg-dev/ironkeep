import { MAX_BACKUP_BYTES } from '@/lib/backup'
import {
  backupFromJson,
  type ImportWarning,
  logRowsToWorkouts,
  measurementValue,
  rowsToBodyweights,
  rowsToMeasurements,
  type SheetRow,
  trackerToWorkouts,
} from '@/lib/logic/import'
import { type PickedFile, sheetsOf } from './files'
import type { PendingImport } from './import-handoff'

/** What a sheet's headers say it is. */
function kindOf(rows: SheetRow[]): 'log' | 'tracker' | 'weights' | 'tape' | null {
  const keys = Object.keys(rows[0] ?? {})
  if (keys.includes('Exercise') && keys.includes('Set')) return 'log'
  if (keys.includes('Exercise') && keys.some((k) => /^Set \d+$/.test(k))) return 'tracker'
  if (['arm', 'chest', 'waist'].some((site) => measurementValue(rows[0] ?? {}, site) !== undefined)) return 'tape'
  if (keys.includes('Date') && keys.some((k) => k.toLowerCase().startsWith('weight'))) return 'weights'
  return null
}

/**
 * Reads a picked file into what the preview page shows: a backup (this app's, or the web app's
 * everything.json) from JSON; the logs from Excel or CSV, in the Log or the Tracker layout, with the
 * weigh-ins and tape sheets when the file has them. Throws with a plain message when it is none of those.
 */
export async function readImport(file: PickedFile): Promise<PendingImport> {
  const name = file.name ?? ''
  const bytes = await file.bytes()
  // JSON by its name, or by its first byte when the picker gave no name: a backup starts with "{".
  const looksJson = name.toLowerCase().endsWith('.json') || (!/\.(xlsx|xls|csv)$/i.test(name) && bytes[0] === 0x7b)
  if (looksJson) {
    if (bytes.length > MAX_BACKUP_BYTES) throw new Error('Backup files must be 20 MB or smaller.')
    const backup = backupFromJson(JSON.parse(new TextDecoder().decode(bytes)))
    if (!backup) throw new Error('This JSON file is not a backup of this app.')
    return { kind: 'backup', name, backup }
  }
  const sheets = sheetsOf(bytes)
  const warnings: ImportWarning[] = []
  const logSheets = sheets.filter((s) => kindOf(s.rows) === 'log')
  const trackerSheets = sheets.filter((s) => kindOf(s.rows) === 'tracker')
  const layout = trackerSheets.length > 0 && logSheets.length === 0 ? 'tracker' : 'log'
  const workouts =
    layout === 'tracker'
      ? trackerToWorkouts(trackerSheets, warnings)
      : logRowsToWorkouts(
          logSheets.flatMap((s) => s.rows),
          warnings,
        )
  const bodyweights = sheets.filter((s) => kindOf(s.rows) === 'weights').flatMap((s) => rowsToBodyweights(s.rows))
  const measurements = sheets.filter((s) => kindOf(s.rows) === 'tape').flatMap((s) => rowsToMeasurements(s.rows))
  if (workouts.length === 0 && bodyweights.length === 0 && measurements.length === 0) {
    throw new Error('No sessions, weigh-ins or tape in this file. Use a backup, or an Excel or CSV export.')
  }
  return { kind: 'logs', name, layout, workouts, bodyweights, measurements, warnings }
}
