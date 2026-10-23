import { useLocalSearchParams, useRouter } from 'expo-router'
import { AlertCircle, ArrowLeft, Upload } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { Stat } from '@/components/stat-tile'
import { BODY, CAPTION, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { restoreBackup } from '@/db/backup'
import * as repo from '@/db/repo'
import { errorMessage, longDate } from '@/lib/format'
import { dedupe, type ImportPreview, previewOf } from '@/lib/logic/import'
import type { DayType, Workout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { writeSnapshot } from './files'
import { getImport, type PendingImport, setImport } from './import-handoff'

const LAYOUT_LABEL = { log: 'Log layout', tracker: 'Tracker layout' } as const
const NEW = 'New'
const SKIPPED = 'Already here, skipped'

const sessionsLine = (n: number): string => `${n} ${n === 1 ? 'session' : 'sessions'}`

/** The plan days found in the sessions, with how many sessions each. */
function dayRows(workouts: Workout[]): { name: string; type: DayType; count: number }[] {
  const byName = new Map<string, { name: string; type: DayType; count: number }>()
  for (const w of workouts) {
    const row = byName.get(w.dayName) ?? { name: w.dayName, type: w.dayType, count: 0 }
    row.count += 1
    byName.set(w.dayName, row)
  }
  return [...byName.values()].sort((a, b) => b.count - a.count)
}

/** "Feb 3 to Oct 18, 2026", or one day. */
function spanLine(from?: string, to?: string): string {
  if (!from || !to) return ''
  return from === to ? longDate(from) : `${longDate(from)} to ${longDate(to)}`
}

/**
 * What a file would do before it does it (canvas: DataImportPreview): the numbers, the new and the
 * already-here, the days found, the rows that were skipped. Logs are added beside what is on the
 * phone; a backup replaces everything, after a snapshot of today. The `/data/import` page.
 */
export function ImportPreviewScreen() {
  const router = useRouter()
  const { setup } = useLocalSearchParams<{ setup?: string }>()
  const measure = useBigTitle()
  const [pending] = useState<PendingImport | null>(getImport)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [kept, setKept] = useState<ReturnType<typeof dedupe> | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (!pending) return
    if (pending.kind === 'backup') {
      const b = pending.backup
      setPreview(previewOf({ workouts: b.workouts, bodyweights: b.bodyweights, measurements: b.measurements }, 0))
      return
    }
    let live = true
    repo.getExportData().then((have) => {
      if (!live) return
      const d = dedupe(pending, have)
      setKept(d)
      setPreview(previewOf(d, d.duplicates))
    })
    return () => {
      live = false
    }
  }, [pending])

  const bar = {
    title: pending?.name ?? 'Import',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
  }
  if (!pending || !preview) return <Screen bar={bar}>{null}</Screen>
  const isBackup = pending.kind === 'backup'
  const subtitle = isBackup
    ? `Backup from ${longDate(pending.backup.exportedAt)}`
    : `${LAYOUT_LABEL[pending.layout]}${preview.from ? `, ${spanLine(preview.from, preview.to)}` : ''}`
  const days = dayRows(isBackup ? pending.backup.workouts : (kept?.workouts ?? []))
  const warnings = isBackup ? [] : pending.warnings
  const nothing = !isBackup && preview.sessions === 0 && preview.weighIns === 0 && preview.tapeDays === 0
  const action = isBackup ? 'Restore this backup' : `Import ${sessionsLine(preview.sessions)}`
  const newLine = sessionsLine(preview.sessions)
  const skippedLine = sessionsLine(preview.duplicates)

  async function apply() {
    if (busy || !pending) return
    setBusy(true)
    setProblem(null)
    try {
      if (pending.kind === 'backup') {
        // A snapshot of today first, so the phone's own data can come back.
        if (!setup) await writeSnapshot()
        await restoreBackup(pending.backup)
      } else if (kept) {
        await repo.importLogs(kept)
      }
      setImport(null)
      if (setup) router.replace('/')
      else router.back()
    } catch (err) {
      setProblem(errorMessage(err, 'The import did not go through. Nothing was changed.'))
      setBusy(false)
    }
  }

  return (
    <Screen
      bar={bar}
      footer={
        <Button className={BTN} disabled={busy || nothing} onPress={apply}>
          <Icon as={Upload} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>{action}</Text>
        </Button>
      }
    >
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text className={cn(TITLE, 'text-3xl leading-10')} numberOfLines={2}>
          {pending.name}
        </Text>
      </View>
      <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>{subtitle}</Text>

      <Group className="mt-4 p-4">
        <View className="flex-row gap-2">
          <Stat value={preview.sessions.toLocaleString()} label="sessions" />
          <Stat value={preview.sets.toLocaleString()} label="sets" />
          <Stat value={preview.weighIns.toLocaleString()} label="weigh-ins" />
          <Stat value={preview.tapeDays.toLocaleString()} label="tapes" />
        </View>
      </Group>

      <Group className="mt-2">
        {!isBackup ? (
          <>
            <Row accessibilityLabel={NEW}>
              <View className="size-2.5 rounded-full bg-success" />
              <RowBody>
                <RowTitle>{NEW}</RowTitle>
              </RowBody>
              <RowValue className={cn(NUMBER, 'text-foreground')}>{newLine}</RowValue>
            </Row>
            <Row accessibilityLabel={SKIPPED}>
              <View className="size-2.5 rounded-full bg-muted" />
              <RowBody>
                <RowTitle>{SKIPPED}</RowTitle>
              </RowBody>
              <RowValue className={cn(NUMBER, 'text-foreground')}>{skippedLine}</RowValue>
            </Row>
          </>
        ) : null}
        {days.map((d) => {
          const count = sessionsLine(d.count)
          return (
            <Row key={d.name} accessibilityLabel={d.name}>
              <DayIcon type={d.type} size="sm" />
              <RowBody>
                <RowTitle>{d.name}</RowTitle>
              </RowBody>
              <RowValue className={cn(NUMBER, 'text-foreground')}>{count}</RowValue>
            </Row>
          )
        })}
      </Group>

      {warnings.length > 0 ? (
        <>
          <Text className={cn(CAPTION, 'mt-6 px-1')}>Check these rows</Text>
          <Group className="mt-2">
            {warnings.slice(0, 20).map((w) => {
              const row = `Row ${w.row.toLocaleString()}`
              return (
                <Row key={`${w.row}-${w.message}`} accessibilityLabel={row}>
                  <Icon as={AlertCircle} strokeWidth={1.75} className="size-5.5 text-destructive" />
                  <RowBody>
                    <RowTitle className={NUMBER}>{row}</RowTitle>
                    <RowSub>{w.message}</RowSub>
                  </RowBody>
                </Row>
              )
            })}
          </Group>
        </>
      ) : null}

      {problem ? <Text className={cn(BODY, 'mt-6 text-destructive')}>{problem}</Text> : null}
      <Text className={cn(BODY, 'mt-6')}>
        {isBackup
          ? setup
            ? 'Nothing is written until you restore. The restore is all or nothing.'
            : 'Restoring replaces what is on the phone. A snapshot of today is written first, so you can come back.'
          : 'Nothing is written until you import. The import is all or nothing.'}
      </Text>
    </Screen>
  )
}
