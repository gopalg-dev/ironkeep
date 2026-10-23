import { useRouter } from 'expo-router'
import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Chip, Chips } from '@/components/chip'
import { DayIcon, dayAccentClass, dayColourClass, dayInkClass } from '@/components/day-icon'
import { LineChart } from '@/components/line-chart'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { BIG_NUMBER, CAPTION, H2, NUMBER, SECONDARY } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { StatsData } from '@/db/repo'
import { shortDate } from '@/lib/format'
import { recentPRs } from '@/lib/logic/stats'
import { TREND_LABEL, TRENDS, type Trend } from '@/lib/logic/trend'
import { fmtSet, fmtWeight } from '@/lib/logic/units'
import { cn } from '@/lib/utils'
import { setPick } from './pick-sheet'
import { bigSet, changeOf, liftsFrom, liftValue, longestRecord, trendsOf, weekCell } from './stats-model'

/** Weeks on the chart and in the table. */
const SHOWN_WEEKS = 8

/**
 * Lifts (canvas: Stats lifts): the lifts by trend, one picked, its best this week with the trend in
 * the day's colour, the weekly line, the last weeks as a table, and the recent bests.
 */
export function LiftsPanel({ data }: { data: StatsData }) {
  const router = useRouter()
  const now = new Date()
  const { plan, workouts, settings, bestBefore } = data
  const units = settings.units
  const lifts = liftsFrom(plan, workouts)
  const { byLift, counts } = trendsOf(lifts, now)
  const [trend, setTrend] = useState<Trend | 'all'>('all')
  const [liftId, setLiftId] = useState<string | null>(null)
  const shown = trend === 'all' ? lifts : lifts.filter((l) => byLift.get(l.ex.id) === trend)
  const selected = shown.find((l) => l.ex.id === liftId) ?? longestRecord(shown) ?? longestRecord(lifts)
  const prs = recentPRs(workouts, now, 14, bestBefore)
  const typeOf = new Map(lifts.map((l) => [l.ex.id, l.ex.type]))

  const openPicker = () => {
    setPick({
      title: 'Lift',
      options: shown.map((l) => ({ id: l.ex.id, label: l.ex.name })),
      current: selected?.ex.id,
      onPick: setLiftId,
    })
    router.push('/pick')
  }

  // Before the first session there is nothing to chart: a plain line, as the web shows, not a blank tab.
  if (lifts.length === 0) return <Text className={cn(SECONDARY, 'mt-6')}>Nothing logged yet.</Text>

  const weeks = selected ? selected.weeks.slice(-SHOWN_WEEKS) : []
  const latest = weeks[weeks.length - 1]
  const big = selected && latest ? bigSet(selected.ex.loadType, latest, units, now) : null
  const liftTrend = selected ? byLift.get(selected.ex.id) : undefined
  const format = selected?.ex.loadType === 'weight' ? fmtWeight : String

  return (
    <View>
      <Chips className="mt-4">
        <TrendChip label={`All ${lifts.length}`} on={trend === 'all'} onPress={() => setTrend('all')} />
        {TRENDS.filter((t) => counts.has(t)).map((t) => (
          <TrendChip
            key={t}
            label={`${TREND_LABEL[t]} ${counts.get(t)}`}
            on={trend === t}
            onPress={() => setTrend(t)}
          />
        ))}
      </Chips>
      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lift, ${selected.ex.name}`}
          onPress={openPicker}
          className="mt-4 min-h-14 flex-row items-center justify-between gap-3 rounded-xl bg-card px-4 active:opacity-80"
        >
          <Text className="shrink text-lg font-semibold text-foreground" numberOfLines={1}>
            {selected.ex.name}
          </Text>
          <Icon as={ChevronDown} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Pressable>
      ) : null}
      {selected && big && latest ? (
        <>
          <View className="mt-2 rounded-xl bg-card px-4 pt-5 pb-3">
            <View className="flex-row items-end justify-between gap-3">
              <View className="shrink">
                <View className="flex-row items-baseline">
                  <Text className={BIG_NUMBER}>{big.value}</Text>
                  <Text className="ml-1 text-lg font-semibold text-muted-foreground">{big.unit}</Text>
                </View>
                <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>{big.line}</Text>
              </View>
              {liftTrend ? (
                <Chip className={dayColourClass(selected.ex.type)} textClassName={dayInkClass(selected.ex.type)}>
                  {TREND_LABEL[liftTrend]}
                </Chip>
              ) : null}
            </View>
            <View className="mt-4">
              <LineChart
                heightClassName="h-40"
                points={weeks.map((p) => ({ date: p.date, value: liftValue(selected.ex.loadType, p) }))}
                accentClassName={dayAccentClass(selected.ex.type)}
                format={format}
                accessibilityLabel={`Weekly best, ${weeks.length} weeks: ${format(liftValue(selected.ex.loadType, weeks[0] ?? latest))} to ${big.value}`}
              />
            </View>
          </View>
          <Group className="mt-2">
            {[...weeks].reverse().map((p, i, all) => {
              const before = all[i + 1]
              const change = before ? changeOf(selected.ex.loadType, before, p, units) : null
              return (
                <Row key={p.week}>
                  <Text className={cn(CAPTION, 'flex-1')}>{weekCell(p.week, i)}</Text>
                  <RowValue className="text-foreground">{fmtSet(selected.ex.loadType, p, units)}</RowValue>
                  <RowValue className={cn('min-w-14 text-right', change?.up && 'text-success')}>
                    {change?.text ?? ''}
                  </RowValue>
                </Row>
              )
            })}
          </Group>
        </>
      ) : null}
      {prs.length > 0 ? (
        <>
          <Text accessibilityRole="header" className={cn(H2, 'mt-8')}>
            Recent bests
          </Text>
          <Group className="mt-3">
            {prs.map((pr) => (
              <Row key={`${pr.exerciseId}-${pr.date}`} tall>
                <DayIcon type={typeOf.get(pr.exerciseId) ?? 'full'} />
                <RowBody>
                  <RowTitle>{pr.name}</RowTitle>
                  <RowSub>{shortDate(pr.date)}</RowSub>
                </RowBody>
                <RowValue className="text-foreground">{fmtSet(pr.loadType, pr, units)}</RowValue>
              </Row>
            ))}
          </Group>
        </>
      ) : null}
    </View>
  )
}

/** A chip that filters: pressed, it fills in. */
function TrendChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={6} onPress={onPress}>
      <Chip on={on}>{label}</Chip>
    </Pressable>
  )
}
