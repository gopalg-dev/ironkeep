import { useFocusEffect, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ArrowLeft, Plus, RotateCcw, Share2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_SM2, BTN_SM2_TEXT, BTN_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { ReplaceDialog } from '@/components/replace-dialog'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Screen } from '@/components/screen'
import { BODY, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { restoreBackup } from '@/db/backup'
import { announce } from '@/lib/announce'
import { errorMessage, longDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  listSnapshots,
  readSnapshot,
  SNAPSHOT_EVERY_DAYS,
  SNAPSHOTS_KEPT,
  type Snapshot,
  shareBackup,
  writeSnapshot,
} from './files'

const WRITE_NOW = 'Write a snapshot now'
const HOW = `Written every ${SNAPSHOT_EVERY_DAYS} days when the app opens. The last ${SNAPSHOTS_KEPT} are kept.`

/** "1.4 MB" or "312 KB". */
function sizeLine(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}

/**
 * Snapshots on this phone (canvas: DataRestore): the app's own weekly backups, newest first, each
 * one shareable and restorable, and a button to write one now. The `/data/snapshots` page.
 */
export function SnapshotsScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const [snapshots, setSnapshots] = useState<(Snapshot & { sessions: number })[]>([])
  const [ask, setAsk] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(async () => {
    const list = listSnapshots()
    const withCounts = await Promise.all(
      list.map(async (s) => {
        try {
          const b = await readSnapshot(s)
          return { ...s, sessions: b.workouts.filter((w) => w.status === 'done').length }
        } catch {
          return { ...s, sessions: 0 }
        }
      }),
    )
    setSnapshots(withCounts)
  }, [])
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

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

  async function restore(s: Snapshot) {
    setAsk(null)
    await run(async () => {
      const backup = await readSnapshot(s)
      await writeSnapshot()
      await restoreBackup(backup)
      announce('Backup restored')
      router.back()
    })
  }

  const bar = {
    title: 'Snapshots',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
  }
  return (
    <Screen bar={bar}>
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={cn(TITLE, 'text-3xl leading-10')}>
          Snapshots on this phone
        </Text>
      </View>
      <Text className={cn(SECONDARY, 'mt-2')}>{HOW}</Text>
      {snapshots.length > 0 ? (
        <Group className="mt-6">
          {snapshots.map((s, i) => {
            const when = longDate(s.at)
            const about = `${s.sessions} sessions, ${sizeLine(s.bytes)}`
            return (
              <Row key={s.name} tall accessibilityLabel={when}>
                <RowBody>
                  <RowTitle className={NUMBER}>{when}</RowTitle>
                  <RowSub className={NUMBER}>{about}</RowSub>
                </RowBody>
                <IconButton
                  as={Share2}
                  accessibilityLabel="Share this snapshot"
                  onPress={() =>
                    run(() => Sharing.shareAsync(s.file.uri, { mimeType: 'application/json', dialogTitle: s.name }))
                  }
                />
                <Button
                  variant={i === 0 ? 'default' : 'secondary'}
                  className={BTN_SM2}
                  disabled={busy}
                  onPress={() => setAsk(s)}
                >
                  <Icon
                    as={RotateCcw}
                    className={cn('size-4', i === 0 ? 'text-primary-foreground' : 'text-foreground')}
                  />
                  <Text className={cn(BTN_SM2_TEXT, i !== 0 && 'text-foreground')}>Restore</Text>
                </Button>
              </Row>
            )
          })}
        </Group>
      ) : null}
      {problem ? <Text className={cn(BODY, 'mt-6 text-destructive')}>{problem}</Text> : null}
      <Text className={cn(BODY, 'mt-6')}>
        Restoring replaces what is on the phone with the snapshot. A snapshot of today is written first, so you can come
        back.
      </Text>
      <Button
        variant="secondary"
        className={cn(BTN, 'mt-6')}
        disabled={busy}
        onPress={() =>
          run(async () => {
            await writeSnapshot()
            announce('Snapshot saved')
          })
        }
      >
        <Icon as={Plus} className="size-4.5 text-foreground" />
        <Text className={cn(BTN_TEXT, 'text-foreground')}>{WRITE_NOW}</Text>
      </Button>

      <ReplaceDialog
        open={ask !== null}
        title="Restore this snapshot?"
        consequence={
          ask ? `Training data becomes what it was on ${longDate(ask.at)}. A recovery snapshot is saved first.` : ''
        }
        onClose={() => setAsk(null)}
        onExport={shareBackup}
        onConfirm={async () => {
          if (ask) await restore(ask)
        }}
      />
    </Screen>
  )
}
