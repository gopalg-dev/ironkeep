import Constants from 'expo-constants'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  ChevronRight,
  FileJson,
  LayoutGrid,
  type LucideIcon,
  Palette,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  Weight,
  X,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useResolveClassNames, useUniwind } from 'uniwind'

import { BTN, BTN_DANGER, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { BODY, CAPTION, H2, NUMBER, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { lastBackupAt, shareBackup } from '@/features/data/files'
import { setPick } from '@/features/stats/pick-sheet'
import { planSourceInfo } from '@/lib/content'
import { relativeDay } from '@/lib/format'
import { GOAL_OPTIONS } from '@/lib/logic/goal'
import { BAR_OPTIONS, barOf, stepsOf } from '@/lib/logic/progression'
import { fmtWeight } from '@/lib/logic/units'
import { BUNDLED_SPLITS } from '@/lib/splits'
import type { Goal, Plan, Schedule, Settings, TrainingAge, Units } from '@/lib/types'
import { cn } from '@/lib/utils'
import { applyLook, currentLook, type Look, lookOptions } from '@/theme/look'

const UNIT_LABEL: Record<Units, string> = { kg: 'Kilograms', lb: 'Pounds' }
const AGE_LABEL: Record<TrainingAge, string> = { under1: 'Under a year', over1: 'A year or more' }
const SCHEDULE_LABEL: Record<Schedule, string> = { rolling: 'Rolling', weekday: 'By weekday' }
const AWAKE_LABEL = { on: 'Keep it on', off: 'Let it sleep' } as const
const DELETE_ALL = 'Delete everything'
const DELETE_PHRASE = 'delete everything'
const SHARE_FIRST = 'Share a backup first'
const DELETE_LINE =
  'Every session, weigh-in and tape entry, the plan and the settings go. Snapshots shared out or in your backup folder stay.'
const YOUR_DATA = 'Your data'

/** "2.5 kg, same for all" or "2.5, 2, 5 kg". */
function stepsLine(settings: Settings): string {
  const s = stepsOf(settings)
  if (settings.sameStep || (s.plates === s.dumbbell && s.plates === s.stack))
    return `${fmtWeight(s.plates, settings.units)}, same for all`
  return `${fmtWeight(s.plates)}, ${fmtWeight(s.dumbbell)}, ${fmtWeight(s.stack, settings.units)}`
}

/**
 * Settings (canvas: Settings): Your data first, then the training choices, each on a pick sheet, the
 * phone's own two, and Start fresh behind a check. The `/settings` page, from the menu.
 */
export function SettingsScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const { theme, hasAdaptiveThemes } = useUniwind()
  const [data, setData] = useState<{ settings: Settings; plan: Plan; backupAt: string | null } | null>(null)
  const [askDelete, setAskDelete] = useState(false)
  const [phrase, setPhrase] = useState('')
  const placeholder = useResolveClassNames('text-muted-foreground')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    let live = true
    Promise.all([repo.getSettings(), repo.getPlan(), lastBackupAt()]).then(([settings, plan, backupAt]) => {
      if (live) setData({ settings, plan, backupAt })
    })
    return () => {
      live = false
    }
  }, [])
  useFocusEffect(load)
  const refresh = () =>
    Promise.all([repo.getSettings(), repo.getPlan(), lastBackupAt()]).then(([settings, plan, backupAt]) =>
      setData({ settings, plan, backupAt }),
    )

  const bar = {
    title: 'Settings',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
  }
  if (!data) return <Screen bar={bar}>{null}</Screen>
  const { settings, plan, backupAt } = data
  const split = planSourceInfo(BUNDLED_SPLITS, settings.split, plan.days.length)
  const version = Constants.expoConfig?.version ?? ''

  /** Opens the pick sheet on a setting's options and saves the pick. */
  function pick<T extends string>(
    title: string,
    options: { id: T; label: string }[],
    current: T,
    save: (v: T) => Promise<unknown>,
  ) {
    setPick({
      title,
      options,
      current,
      onPick: (id) => void save(id as T).then(refresh),
    })
    router.push('/pick')
  }
  const look = currentLook(theme, hasAdaptiveThemes)

  const typed = phrase.trim().toLowerCase() === DELETE_PHRASE

  async function deleteAll() {
    if (busy || !typed) return
    setBusy(true)
    try {
      await repo.startFresh()
      setAskDelete(false)
      router.replace('/setup')
    } finally {
      setBusy(false)
    }
  }

  async function backupFirst() {
    if (busy) return
    setBusy(true)
    try {
      await shareBackup()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen bar={bar}>
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Settings
        </Text>
      </View>
      <Group className="mt-6">
        <Row tall accessibilityLabel={YOUR_DATA} onPress={() => router.push('/data')}>
          <Icon as={ShieldCheck} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{YOUR_DATA}</RowTitle>
            <RowSub className={NUMBER}>{backupAt ? `Last backup ${relativeDay(backupAt)}` : 'No backup yet'}</RowSub>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
      </Group>

      <Text className={cn(CAPTION, 'mt-6 px-1')}>Training</Text>
      <Group className="mt-2">
        <Setting
          icon={Scale}
          title="Units"
          value={UNIT_LABEL[settings.units]}
          onPress={() =>
            pick<Units>(
              'Units',
              [
                { id: 'kg', label: UNIT_LABEL.kg },
                { id: 'lb', label: UNIT_LABEL.lb },
              ],
              settings.units,
              (units) => repo.saveSettings({ units }),
            )
          }
        />
        <Setting
          icon={Weight}
          title="Empty bar"
          value={fmtWeight(barOf(settings), settings.units)}
          onPress={() =>
            pick<string>(
              'Empty bar',
              BAR_OPTIONS[settings.units].map((b) => ({ id: String(b), label: fmtWeight(b, settings.units) })),
              String(barOf(settings)),
              (b) => repo.saveSettings({ bar: Number(b) }),
            )
          }
        />
        <Setting
          icon={SlidersHorizontal}
          title="Smallest steps"
          value={stepsLine(settings)}
          onPress={() => router.push('/steps')}
        />
        <Setting
          icon={CalendarDays}
          title="Training age"
          value={AGE_LABEL[settings.trainingAge]}
          onPress={() =>
            pick<TrainingAge>(
              'Training age',
              [
                { id: 'under1', label: AGE_LABEL.under1 },
                { id: 'over1', label: AGE_LABEL.over1 },
              ],
              settings.trainingAge,
              (trainingAge) => repo.saveSettings({ trainingAge }),
            )
          }
        />
        <Setting
          icon={Target}
          title="Bodyweight goal"
          value={GOAL_OPTIONS.find((g) => g.value === (settings.goal ?? 'hold'))?.label ?? ''}
          onPress={() =>
            pick<Goal>(
              'Bodyweight goal',
              GOAL_OPTIONS.map((g) => ({ id: g.value, label: g.label })),
              settings.goal ?? 'hold',
              (goal) => repo.saveSettings({ goal }),
            )
          }
        />
        <Setting
          icon={Calendar}
          title="Schedule"
          value={SCHEDULE_LABEL[settings.schedule ?? 'rolling']}
          onPress={() =>
            pick<Schedule>(
              'Schedule',
              [
                { id: 'rolling', label: SCHEDULE_LABEL.rolling },
                { id: 'weekday', label: SCHEDULE_LABEL.weekday },
              ],
              settings.schedule ?? 'rolling',
              (schedule) => repo.setSchedule(schedule),
            )
          }
        />
        <Setting icon={LayoutGrid} title="Split" value={split.name} onPress={() => router.push('/split')} />
      </Group>

      <Text className={cn(CAPTION, 'mt-6 px-1')}>Phone</Text>
      <Group className="mt-2">
        <Setting
          icon={Sun}
          title="Screen during a session"
          value={settings.keepAwake === false ? AWAKE_LABEL.off : AWAKE_LABEL.on}
          onPress={() =>
            pick<'on' | 'off'>(
              'Screen during a session',
              [
                { id: 'on', label: AWAKE_LABEL.on },
                { id: 'off', label: AWAKE_LABEL.off },
              ],
              settings.keepAwake === false ? 'off' : 'on',
              (v) => repo.saveSettings({ keepAwake: v === 'on' }),
            )
          }
        />
        <Setting
          icon={Palette}
          title="Look"
          value={lookOptions().find((o) => o.id === look)?.label ?? ''}
          onPress={() => pick<Look>('Look', lookOptions(), look, applyLook)}
        />
      </Group>

      <Group className="mt-6">
        <Row
          accessibilityLabel={DELETE_ALL}
          onPress={() => {
            setPhrase('')
            setAskDelete(true)
          }}
        >
          <Icon as={Trash2} strokeWidth={1.75} className="size-5.5 text-destructive" />
          <RowBody>
            <RowTitle className="text-destructive">{DELETE_ALL}</RowTitle>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
      </Group>
      {version ? <Text className={cn(CAPTION, NUMBER, 'mt-6 px-1')}>{`Ironkeep ${version}`}</Text> : null}

      <Dialog open={askDelete} onClose={() => setAskDelete(false)}>
        <View className="gap-2">
          <Text accessibilityRole="header" className={H2}>
            Delete everything?
          </Text>
          <Text className={cn(BODY, 'text-muted-foreground')}>{DELETE_LINE}</Text>
        </View>
        <Button variant="secondary" className={cn(BTN, 'bg-background')} disabled={busy} onPress={backupFirst}>
          <Icon as={FileJson} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_TEXT, 'text-foreground')}>{SHARE_FIRST}</Text>
        </Button>
        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          placeholder={`Type ${DELETE_PHRASE}`}
          placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={`Type ${DELETE_PHRASE}`}
          className={cn(BODY, 'min-h-12 rounded-xl bg-background px-4')}
        />
        <View className="gap-1">
          <Button
            variant="destructive"
            className={cn(BTN, BTN_DANGER, !typed && 'opacity-40')}
            disabled={!typed || busy}
            onPress={deleteAll}
          >
            <Icon as={Trash2} className="size-4.5 text-white" />
            <Text className={cn(BTN_TEXT, 'text-white')}>{DELETE_ALL}</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => setAskDelete(false)}>
            <Icon as={X} className="size-4.5 text-foreground" />
            <Text className="text-lg font-semibold text-foreground">Cancel</Text>
          </Button>
        </View>
      </Dialog>
    </Screen>
  )
}

/** One setting: an icon, its name, its value, and the chevron to change it. */
function Setting({
  icon,
  title,
  value,
  onPress,
}: {
  icon: LucideIcon
  title: string
  value: string
  onPress: () => void
}) {
  return (
    <Row accessibilityLabel={`${title}, ${value}`} onPress={onPress}>
      <Icon as={icon} strokeWidth={1.75} className="size-5.5 text-foreground" />
      <RowBody>
        <RowTitle>{title}</RowTitle>
      </RowBody>
      <RowValue className="shrink text-right">{value}</RowValue>
      <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
    </Row>
  )
}
