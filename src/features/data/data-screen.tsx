import { useFocusEffect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  History,
  Mail,
  Share2,
  Upload,
  X,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN, BTN_SM2, BTN_SM2_TEXT, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Screen } from '@/components/screen'
import { Stat } from '@/components/stat-tile'
import { BODY, CAPTION, H2, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { type DataCounts, dataCounts, getPref, setPref } from '@/db/backup'
import * as repo from '@/db/repo'
import { setPick } from '@/features/stats/pick-sheet'
import { errorMessage, relativeDay } from '@/lib/format'
import type { ExportLayout } from '@/lib/logic/export'
import type { Settings } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  backupFolder,
  emailBackup,
  forgetBackupFolder,
  lastBackupAt,
  listSnapshots,
  PREF_EMAIL,
  pickBackupFolder,
  pickFile,
  shareBackup,
  shareCsv,
  shareExcel,
} from './files'
import { setImport } from './import-handoff'
import { readImport } from './read-file'

const EMAIL = 'Email to me'
const FOLDER = 'Backup folder'
const IMPORT_FILE = 'Import a file'
const IMPORT_SUB = 'Backup, Excel or CSV'
const SNAPSHOTS = 'Snapshots on this phone'
const LAYOUTS: { id: ExportLayout; label: string }[] = [
  { id: 'log', label: 'Log, one row per set' },
  { id: 'tracker', label: 'Tracker, a sheet per day' },
]

interface Loaded {
  settings: Settings
  counts: DataCounts
  backupAt: string | null
  folder: string | null
  email: string | null
  snapshots: { count: number; newest: string | null }
}

/** The folder's last path part, as the row shows it: "Ironkeep" from a content URI. */
function folderName(uri: string): string {
  const tail = decodeURIComponent(uri.split(/[/:]/).pop() ?? '')
  return tail || 'the folder you picked'
}

/**
 * Your data (canvas: SettingsData, DataDeleteAll): what the phone holds, the ways out (backup file,
 * Excel, CSV, mail, a folder), the ways in (a file, the snapshots), and Delete everything behind a
 * typed phrase. The `/data` page, from Settings and from Stats.
 */
export function DataScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const placeholder = useResolveClassNames('text-muted-foreground')
  const [data, setData] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [askEmail, setAskEmail] = useState(false)
  const [email, setEmail] = useState('')

  const load = useCallback(async () => {
    const [settings, counts, backupAt, folder, mail] = await Promise.all([
      repo.getSettings(),
      dataCounts(),
      lastBackupAt(),
      backupFolder(),
      getPref(PREF_EMAIL),
    ])
    const snaps = listSnapshots()
    setData({
      settings,
      counts,
      backupAt,
      folder: folder?.uri ?? null,
      email: mail,
      snapshots: { count: snaps.length, newest: snaps[0]?.at ?? null },
    })
  }, [])
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  /** Runs one of the file actions, one at a time, and shows what went wrong when it did. */
  async function run(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try {
      await action()
      await load()
    } catch (err) {
      setProblem(errorMessage(err, 'That did not work.'))
    } finally {
      setBusy(false)
    }
  }

  const bar = {
    title: 'Your data',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
  }
  if (!data) return <Screen bar={bar}>{null}</Screen>
  const { settings, counts, backupAt, folder, snapshots } = data
  const units = settings.units
  const backupLine = backupAt
    ? `Last backup ${relativeDay(backupAt)}${folder ? `, in ${folderName(folder)}` : ''}`
    : 'No backup yet'
  const snapshotLine =
    snapshots.count === 0 ? 'None yet' : `${snapshots.count} kept, newest ${relativeDay(snapshots.newest ?? '')}`

  function pickExcel() {
    setPick({
      title: 'Excel',
      options: LAYOUTS,
      current: 'log',
      onPick: (id) => void run(() => shareExcel(id as ExportLayout, units)),
    })
    router.push('/pick')
  }

  async function importFile() {
    await run(async () => {
      const file = await pickFile()
      if (!file) return
      setImport(await readImport(file))
      router.push('/data/import')
    })
  }

  async function sendMail() {
    const to = email.trim()
    if (!to) return
    setAskEmail(false)
    await run(async () => {
      await setPref(PREF_EMAIL, to)
      if (!(await emailBackup(to))) throw new Error('No mail app on this phone.')
    })
  }

  return (
    <Screen bar={bar}>
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Your data
        </Text>
      </View>

      <Group className="mt-4 p-4">
        <View className="flex-row gap-2">
          <Stat value={counts.sessions.toLocaleString()} label="sessions" />
          <Stat value={counts.sets.toLocaleString()} label="sets" />
          <Stat value={String(counts.months)} label="months" />
        </View>
        <Text className={cn(SECONDARY, NUMBER, 'mt-3')}>{backupLine}</Text>
      </Group>
      {problem ? <Text className={cn(BODY, 'mt-3 px-1 text-destructive')}>{problem}</Text> : null}

      <Text className={cn(CAPTION, 'mt-6 px-1')}>Export</Text>
      <Group className="mt-2">
        <ExportRow
          icon={FileJson}
          title="Backup file"
          sub="Everything, as JSON"
          primary
          busy={busy}
          onPress={() => run(shareBackup)}
        />
        <ExportRow icon={FileSpreadsheet} title="Excel" sub="Log or Tracker layout" busy={busy} onPress={pickExcel} />
        <ExportRow
          icon={FileText}
          title="CSV"
          sub="One row per set"
          busy={busy}
          onPress={() => run(() => shareCsv(units))}
        />
      </Group>
      <Group className="mt-2">
        <Row
          accessibilityLabel={EMAIL}
          onPress={() => {
            setEmail(data.email ?? '')
            setAskEmail(true)
          }}
        >
          <Icon as={Mail} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{EMAIL}</RowTitle>
            <RowSub>{data.email ?? 'Pick an address'}</RowSub>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
        <Row
          accessibilityLabel={FOLDER}
          onPress={() => run(async () => (folder ? forgetBackupFolder() : pickBackupFolder()))}
        >
          <Icon as={FolderOpen} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{FOLDER}</RowTitle>
            <RowSub className={NUMBER}>
              {folder ? `${folderName(folder)}, every 7 days` : 'None, snapshots stay in the app'}
            </RowSub>
          </RowBody>
          {folder ? (
            <Icon as={X} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
          ) : (
            <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
          )}
        </Row>
      </Group>

      <Text className={cn(CAPTION, 'mt-6 px-1')}>Import</Text>
      <Group className="mt-2">
        <Row tall accessibilityLabel={IMPORT_FILE} onPress={importFile}>
          <Icon as={Upload} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{IMPORT_FILE}</RowTitle>
            <RowSub>{IMPORT_SUB}</RowSub>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
        <Row tall accessibilityLabel={SNAPSHOTS} onPress={() => router.push('/data/snapshots')}>
          <Icon as={History} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{SNAPSHOTS}</RowTitle>
            <RowSub className={NUMBER}>{snapshotLine}</RowSub>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
      </Group>

      <Dialog open={askEmail} onClose={() => setAskEmail(false)}>
        <Text accessibilityRole="header" className={H2}>
          {EMAIL}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoFocus
          accessibilityLabel="Email address"
          className={cn(BODY, 'min-h-12 rounded-xl bg-background px-4')}
        />
        <View className="gap-2">
          <Button className={BTN} disabled={!email.trim() || busy} onPress={sendMail}>
            <Icon as={Mail} className="size-4.5 text-primary-foreground" />
            <Text className={BTN_TEXT}>Send the backup</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => setAskEmail(false)}>
            <Text className="text-lg font-semibold text-foreground">Cancel</Text>
          </Button>
        </View>
      </Dialog>
    </Screen>
  )
}

/** One export: what it is, and a Share button on the right; the backup's is the ink one. */
function ExportRow({
  icon,
  title,
  sub,
  primary = false,
  busy,
  onPress,
}: {
  icon: typeof FileJson
  title: string
  sub: string
  primary?: boolean
  busy: boolean
  onPress: () => void
}) {
  return (
    <Row tall accessibilityLabel={title}>
      <Icon as={icon} strokeWidth={1.75} className="size-5.5 text-foreground" />
      <RowBody>
        <RowTitle>{title}</RowTitle>
        <RowSub>{sub}</RowSub>
      </RowBody>
      <Button variant={primary ? 'default' : 'secondary'} className={BTN_SM2} disabled={busy} onPress={onPress}>
        <Icon as={Share2} className={cn('size-4', primary ? 'text-primary-foreground' : 'text-foreground')} />
        <Text className={cn(BTN_SM2_TEXT, !primary && 'text-foreground')}>Share</Text>
      </Button>
    </Row>
  )
}
