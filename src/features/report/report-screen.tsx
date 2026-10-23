import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Dumbbell, Scale, Share2, TrendingUp } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayIcon, dayColourClass, FAMILY_DAY } from '@/components/day-icon'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { Segmented } from '@/components/segmented'
import { BIG_NUMBER, CAPTION, H2, HERO_FONT_CAP, MID_NUMBER, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { longDate, shortDate } from '@/lib/format'
import {
  beforeLabel,
  buildReport,
  compared,
  daysOf,
  finishedPeriod,
  firstReportOn,
  hasNext,
  lastFinished,
  MIN_SESSIONS,
  type PeriodKind,
  periodLabel,
  shiftPeriod,
} from '@/lib/logic/report'
import { addDays, noon } from '@/lib/logic/stats'
import { fmtSet, fmtWeight } from '@/lib/logic/units'
import { cn } from '@/lib/utils'
import { attentionRows, bodyweightCaption, liftIdsByName, liftTypes } from './report-model'
import { setShare } from './share-handoff'

const KINDS: { value: PeriodKind; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

/**
 * The look back (canvas: Report): a finished week or month next to the one before. The period row,
 * the sessions with the days, three tiles, what went well, what needs attention, and Share.
 * `/report?period=month&at=2026-09-15` opens that month; the last week when absent.
 */
export function ReportScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const params = useLocalSearchParams<{ period?: string; at?: string }>()
  const [data, setData] = useState<repo.StatsData | null>(null)
  const [kind, setKind] = useState<PeriodKind>(params.period === 'month' ? 'month' : 'week')
  const now = new Date()
  const [anchor, setAnchor] = useState<Date>(() =>
    params.at && /^\d{4}-\d{2}-\d{2}$/.test(params.at) ? new Date(noon(params.at)) : lastFinished(kind, now),
  )
  const load = useCallback(() => {
    let live = true
    repo.getStatsData().then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [])
  useFocusEffect(load)

  const switchKind = (next: PeriodKind) => {
    setKind(next)
    setAnchor(lastFinished(next, now))
  }

  const bar = {
    title: 'Report',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
    right: (
      <Segmented
        options={KINDS}
        value={kind}
        onChange={switchKind}
        accessibilityLabel="Week or month"
        className="w-40"
      />
    ),
  }
  if (!data) return <Screen bar={bar}>{null}</Screen>

  const { settings, workouts } = data
  const units = settings.units
  const period = finishedPeriod(kind, anchor, now)
  const report = buildReport(data, period)
  const days = daysOf(period, workouts)
  const firstReport = firstReportOn(kind, now, workouts)
  const unit = kind === 'week' ? 'week' : 'month'
  const before = beforeLabel(kind)
  // A year of data is loaded, so the arrows stop at a year ago, or at the join date when later.
  const yearAgo = addDays(now, -365)
  const earliest = settings.joinedAt && new Date(settings.joinedAt) > yearAgo ? new Date(settings.joinedAt) : yearAgo
  const canEarlier = period.start.getTime() > earliest.getTime()
  const canLater = hasNext(period, now)
  const shareable = !firstReport && report.enough
  const types = liftTypes(workouts)
  const attention = attentionRows(report, kind, types, liftIdsByName(workouts))
  const bw = report.bodyweight

  const share = () => {
    setShare({ report, period, days, units })
    router.push('/share')
  }

  return (
    <Screen
      bar={bar}
      footerClassName="pb-10"
      footer={
        shareable ? (
          <Button className={BTN} onPress={share}>
            <Icon as={Share2} className="size-4.5 text-primary-foreground" />
            <Text className={BTN_TEXT}>Share</Text>
          </Button>
        ) : undefined
      }
    >
      <View className="min-h-11" />
      <View
        className="mt-4 flex-row items-center justify-between gap-3"
        onLayout={(e) => measure(e.nativeEvent.layout)}
      >
        <Text className="shrink text-3xl font-condensed-semibold leading-11.5 text-foreground" numberOfLines={1}>
          {periodLabel(period)}
        </Text>
        <View className="flex-row gap-2">
          <IconButton
            as={ChevronLeft}
            size="sm"
            tone="surface"
            accessibilityLabel={`Earlier ${unit}`}
            disabled={!canEarlier}
            className={cn(!canEarlier && 'opacity-40')}
            onPress={() => setAnchor(shiftPeriod(kind, period.start, -1))}
          />
          <IconButton
            as={ChevronRight}
            size="sm"
            tone="surface"
            accessibilityLabel={`Later ${unit}`}
            disabled={!canLater}
            className={cn(!canLater && 'opacity-40')}
            onPress={() => setAnchor(shiftPeriod(kind, period.start, 1))}
          />
        </View>
      </View>

      {firstReport ? (
        <EmptyState line={`Your first ${unit}ly report comes on ${longDate(firstReport.toISOString())}.`} />
      ) : !report.enough ? (
        <EmptyState line={`Not enough sessions: ${report.sessions.done} of ${MIN_SESSIONS[kind]} for a ${unit}.`} />
      ) : (
        <>
          <View className="mt-4 rounded-xl bg-card px-4 pt-5 pb-4">
            <View className="flex-row items-baseline">
              <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={BIG_NUMBER}>
                {report.sessions.done}
              </Text>
              <Text className={cn('ml-1 text-xl font-semibold text-muted-foreground', NUMBER)}>
                {`of ${report.sessions.planned} ${report.sessions.planned === 1 ? 'session' : 'sessions'}`}
              </Text>
            </View>
            <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>
              {compared(report.sessions.done, report.sessions.prev, before)}
            </Text>
            <View
              className="mt-4 flex-row gap-1"
              accessibilityRole="image"
              accessibilityLabel={`${days.filter((d) => d.dayType).length} of ${days.length} days trained`}
            >
              {days.map((d) => (
                <View
                  key={d.key}
                  className={cn('h-2 flex-1 rounded-sm', d.dayType ? dayColourClass(d.dayType) : 'bg-secondary')}
                />
              ))}
            </View>
          </View>
          <View className="mt-2 flex-row gap-2">
            <Tile icon={Dumbbell} value={String(report.sets.now)} label="hard sets" />
            <Tile icon={TrendingUp} value={String(report.bests.length)} label="new bests" />
            <Tile icon={Scale} value={bw ? fmtWeight(bw.to) : '–'} label={bodyweightCaption(report, units)} />
          </View>

          <Text accessibilityRole="header" className={cn(H2, 'mt-6')}>
            Went well
          </Text>
          {report.bests.length === 0 && report.movers.length === 0 ? (
            <Text className={cn(SECONDARY, 'mt-3')}>{`No new bests this ${unit}.`}</Text>
          ) : (
            <Group className="mt-3">
              {report.bests.map((pr) => {
                const when = `New best, ${shortDate(pr.date)}`
                return (
                  <Row key={`${pr.exerciseId}-${pr.date}`} tall>
                    <DayIcon type={types.get(pr.exerciseId) ?? 'full'} />
                    <RowBody>
                      <RowTitle>{pr.name}</RowTitle>
                      <RowSub>{when}</RowSub>
                    </RowBody>
                    <RowValue className="text-foreground">{fmtSet(pr.loadType, pr, units)}</RowValue>
                  </Row>
                )
              })}
              {report.movers.map((m) => {
                const up = `Up ${Math.round(m.changePct)}% on ${before}`
                return (
                  <Row key={m.to.exerciseId} tall>
                    <DayIcon type={types.get(m.to.exerciseId) ?? 'full'} />
                    <RowBody>
                      <RowTitle>{m.to.name}</RowTitle>
                      <RowSub>{up}</RowSub>
                    </RowBody>
                    <RowValue className="text-foreground">{fmtSet(m.to.loadType, m.to, units)}</RowValue>
                  </Row>
                )
              })}
            </Group>
          )}

          {attention.length > 0 ? (
            <>
              <Text accessibilityRole="header" className={cn(H2, 'mt-6')}>
                Needs attention
              </Text>
              <Group className="mt-3">
                {attention.map((r) => (
                  <Row key={r.key} tall>
                    {r.type ? (
                      <DayIcon type={r.type} />
                    ) : r.family ? (
                      <DayIcon type={FAMILY_DAY[r.family]} />
                    ) : (
                      <View className="size-9 items-center justify-center">
                        <View className="size-2.5 rounded-full bg-muted-foreground" />
                      </View>
                    )}
                    <RowBody>
                      <RowTitle>{r.title}</RowTitle>
                      <RowSub>{r.sub}</RowSub>
                    </RowBody>
                  </Row>
                ))}
              </Group>
            </>
          ) : null}
        </>
      )}
    </Screen>
  )
}

/** One of the three numbers under the sessions: an icon, the number, what it is. */
function Tile({ icon, value, label }: { icon: typeof Dumbbell; value: string; label: string }) {
  return (
    <View className="flex-1 gap-1 rounded-xl bg-card px-3.5 pt-3.5 pb-3">
      <Icon as={icon} strokeWidth={1.75} className="size-4.5 text-muted-foreground" />
      <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={cn(MID_NUMBER, 'text-3xl')}>
        {value}
      </Text>
      <Text className={CAPTION}>{label}</Text>
    </View>
  )
}
