import { getDocumentAsync } from 'expo-document-picker'
import { Directory, File, Paths } from 'expo-file-system'
import * as MailComposer from 'expo-mail-composer'
import * as Sharing from 'expo-sharing'
import * as XLSX from 'xlsx'

import { type Backup, dataCounts, exportBackup, getPref, setPref } from '@/db/backup'
import * as repo from '@/db/repo'
import {
  bodyweightsToRows,
  type ExportLayout,
  exportFileName,
  measurementsToRows,
  setHeaders,
  setsToRows,
  trackerSheets,
} from '@/lib/logic/export'
import { dayKey } from '@/lib/logic/stats'
import type { Units } from '@/lib/types'

/*
 * The files of Your data: the snapshots the app keeps on its own, the backup and the logs shared out,
 * the mail, and the folder a copy of each snapshot goes to. expo-file-system's File and Directory,
 * expo-sharing for the share sheet, expo-mail-composer for the mail.
 */

/** Snapshots live in the app's own documents, out of sight; eight are kept, one a week. */
const SNAPSHOT_DIR = 'backups'
export const SNAPSHOTS_KEPT = 8
export const SNAPSHOT_EVERY_DAYS = 7
export const PREF_FOLDER = 'backupFolder'
export const PREF_EMAIL = 'email'
const PREF_LAST = 'lastBackupAt'

const JSON_TYPE = 'application/json'
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const CSV_TYPE = 'text/csv'

function snapshotDir(): Directory {
  const dir = new Directory(Paths.document, SNAPSHOT_DIR)
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
  return dir
}

/** `ironkeep-backup-2026-10-22.json`: the backup file's name, by the day. */
export const backupFileName = (now = new Date()): string => `ironkeep-backup-${dayKey(now)}.json`

export interface Snapshot {
  file: File
  name: string
  /** When it was written, ISO. */
  at: string
  bytes: number
}

/** The snapshots on the phone, newest first. */
export function listSnapshots(): Snapshot[] {
  return snapshotDir()
    .list()
    .filter((f): f is File => f instanceof File && f.name.endsWith('.json'))
    .map((file) => ({
      file,
      name: file.name,
      at: new Date(file.modificationTime ?? 0).toISOString(),
      bytes: file.size ?? 0,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** When the last backup was made, by the app or by hand; null before the first. */
export async function lastBackupAt(): Promise<string | null> {
  return (await getPref(PREF_LAST)) ?? listSnapshots()[0]?.at ?? null
}

/** Writes a snapshot of everything now, mirrors it to the folder when one is set, and keeps the newest eight. */
export async function writeSnapshot(now = new Date()): Promise<Snapshot> {
  const json = JSON.stringify(await exportBackup(now))
  const file = new File(snapshotDir(), `ironkeep-snapshot-${now.toISOString().replace(/[:.]/g, '-')}.json`)
  file.write(json)
  await setPref(PREF_LAST, now.toISOString())
  for (const old of listSnapshots().slice(SNAPSHOTS_KEPT)) old.file.delete()
  await mirrorToFolder(json, backupFileName(now))
  return { file, name: file.name, at: now.toISOString(), bytes: file.size ?? 0 }
}

/** A snapshot a week, taken on a launch once seven days have passed since the last backup. */
export async function autoSnapshot(now = new Date()): Promise<void> {
  const last = await lastBackupAt()
  if (last && now.getTime() - new Date(last).getTime() < SNAPSHOT_EVERY_DAYS * 86_400_000) return
  const counts = await dataCounts(now)
  if (counts.sessions === 0 && counts.weighIns === 0 && counts.tapeDays === 0) return
  await writeSnapshot(now)
}

/** Reads a snapshot back. */
export async function readSnapshot(s: Snapshot): Promise<Backup> {
  return JSON.parse(await s.file.text()) as Backup
}

// ---------------------------------------------------------------- the folder

/** The folder a copy of every snapshot goes to, picked once through the system's folder picker. */
export async function backupFolder(): Promise<Directory | null> {
  const uri = await getPref(PREF_FOLDER)
  if (!uri) return null
  try {
    const dir = new Directory(uri)
    return dir.exists ? dir : null
  } catch {
    return null
  }
}

export async function pickBackupFolder(): Promise<Directory | null> {
  try {
    const dir = await Directory.pickDirectoryAsync()
    await setPref(PREF_FOLDER, dir.uri)
    return dir
  } catch {
    return null
  }
}

export async function forgetBackupFolder(): Promise<void> {
  await setPref(PREF_FOLDER, null)
}

async function mirrorToFolder(json: string, name: string): Promise<void> {
  const dir = await backupFolder()
  if (!dir) return
  try {
    // A picked folder is a content URI: files in it are made through the folder, not by joining a path.
    for (const old of dir.list()) if (old instanceof File && old.name === name) old.delete()
    dir.createFile(name, JSON_TYPE).write(json)
  } catch {
    // A folder that is gone or no longer allowed is left for the next pick; the phone's own snapshot stands.
  }
}

// ---------------------------------------------------------------- sharing out

/** Writes `content` to the cache under `name` and hands it to the share sheet. */
export async function shareBytes(name: string, content: string | Uint8Array, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name)
  if (file.exists) file.delete()
  file.write(content)
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name })
}

/** The backup file, as JSON, to the share sheet; it counts as a backup. */
export async function shareBackup(now = new Date()): Promise<void> {
  const backup = await exportBackup(now)
  await shareBytes(backupFileName(now), JSON.stringify(backup), JSON_TYPE)
  await setPref(PREF_LAST, now.toISOString())
}

/** The logs as a workbook: the Log layout's three sheets, or the Tracker layout's sheet per day. */
export async function logsWorkbook(layout: ExportLayout, units: Units): Promise<XLSX.WorkBook> {
  const data = await repo.getExportData()
  const wb = XLSX.utils.book_new()
  if (layout === 'tracker') {
    for (const sheet of trackerSheets(data.workouts, units)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]), sheet.name)
    }
  } else {
    const rows = setsToRows(data.workouts).map((r) => {
      const { Weight, ...rest } = r
      return { ...rest, [`Weight (${units})`]: Weight }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: setHeaders(units) }), 'Sets')
  }
  const weights = XLSX.utils.json_to_sheet(bodyweightsToRows(data.bodyweights))
  XLSX.utils.sheet_add_aoa(weights, [['Date', `Weight (${units})`]], { origin: 'A1' })
  const tape = XLSX.utils.json_to_sheet(measurementsToRows(data.measurements))
  const length = units === 'kg' ? 'cm' : 'in'
  XLSX.utils.sheet_add_aoa(tape, [['Date', `Arm (${length})`, `Chest (${length})`, `Waist (${length})`]], {
    origin: 'A1',
  })
  XLSX.utils.book_append_sheet(wb, weights, 'Bodyweight')
  XLSX.utils.book_append_sheet(wb, tape, 'Measurements')
  return wb
}

export async function shareExcel(layout: ExportLayout, units: Units, now = new Date()): Promise<void> {
  const wb = await logsWorkbook(layout, units)
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  await shareBytes(exportFileName('xlsx', now, layout), new Uint8Array(bytes), XLSX_TYPE)
}

/** The Log layout as CSV: the sets only, one row per set. */
export async function shareCsv(units: Units, now = new Date()): Promise<void> {
  const wb = await logsWorkbook('log', units)
  const sheet = wb.Sheets[wb.SheetNames[0] ?? 'Sets']
  if (!sheet) return
  await shareBytes(exportFileName('csv', now), XLSX.utils.sheet_to_csv(sheet), CSV_TYPE)
}

/** The backup file mailed to the address kept in prefs, through the phone's mail app. */
export async function emailBackup(to: string, now = new Date()): Promise<boolean> {
  if (!(await MailComposer.isAvailableAsync())) return false
  const backup = await exportBackup(now)
  const file = new File(Paths.cache, backupFileName(now))
  if (file.exists) file.delete()
  file.write(JSON.stringify(backup))
  await MailComposer.composeAsync({
    recipients: [to],
    subject: `IronKeep backup, ${dayKey(now)}`,
    body: 'Everything the app holds, as one file. Restore it under Settings, Your data, Import a file.',
    attachments: [file.uri],
  })
  await setPref(PREF_LAST, now.toISOString())
  return true
}

// ---------------------------------------------------------------- reading a file in

export interface PickedFile {
  name: string
  text: () => Promise<string>
  bytes: () => Promise<Uint8Array>
}

/** The system's file picker, for a backup, an Excel file or a CSV. Null when nothing was picked. */
export async function pickFile(): Promise<PickedFile | null> {
  const picked = await getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
  if (picked.canceled) return null
  const asset = picked.assets[0]
  if (!asset) throw new Error('The selected file could not be opened.')
  const file = new File(asset.uri)
  return { name: asset.name || file.name || 'file', text: () => file.text(), bytes: () => file.bytes() }
}

/** Every sheet of a workbook as rows keyed by its headers. */
export function sheetsOf(bytes: Uint8Array): { name: string; rows: Record<string, unknown>[] }[] {
  const wb = XLSX.read(bytes, { type: 'array', cellDates: false })
  return wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name]
    return { name, rows: sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) : [] }
  })
}

/** The raw database file, for the migration-failed screen: every byte of it, to the share sheet. */
export async function shareRawDatabase(): Promise<void> {
  const db = new File(Paths.document, 'SQLite', 'ironkeep.db')
  if (!db.exists) return
  await Sharing.shareAsync(db.uri, { mimeType: 'application/octet-stream', dialogTitle: 'ironkeep.db' })
}
