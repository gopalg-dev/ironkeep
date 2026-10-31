import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Chip, Chips } from '@/components/chip'
import { DayIcon } from '@/components/day-icon'
import { EmptyState } from '@/components/empty-state'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { H2, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import type { StatsData } from '@/db/repo'
import { shortDate } from '@/lib/format'
import { recentPRs } from '@/lib/logic/stats'
import { TREND_LABEL, TRENDS, type Trend } from '@/lib/logic/trend'
import { fmtSet } from '@/lib/logic/units'
import { cn } from '@/lib/utils'
import { LiftOverview } from './lift-overview'
import { liftsFrom, trendsOf } from './stats-model'

/**
 * Lifts (canvas: Stats lifts): the lifts by trend, one picked, its best this week with the trend in
 * the day's colour, the weekly line, the last weeks as a table, and the recent bests.
 */
export function LiftsPanel({ data }: { data: StatsData }) {
  const now = new Date()
  const { plan, workouts, settings, bestBefore } = data
  const units = settings.units
  const lifts = liftsFrom(plan, workouts)
  const { byLift, counts } = trendsOf(lifts, now)
  const [trend, setTrend] = useState<Trend | 'all'>('all')
  const activeTrend = trend === 'all' || counts.has(trend) ? trend : 'all'
  // Clear an unavailable selection permanently, including when a category returns later.
  if (activeTrend !== trend) setTrend(activeTrend)
  const shown = activeTrend === 'all' ? lifts : lifts.filter((l) => byLift.get(l.key) === activeTrend)
  const prs = recentPRs(workouts, now, 14, bestBefore)
  const typeOf = new Map(lifts.map((l) => [l.ex.id, l.ex.type]))

  // Before the first session there is nothing to chart: a calm illustration and a plain fact, not a
  // blank tab (docs/research/empty-states.md).
  if (lifts.length === 0) return <EmptyState illustration="lifts" line="Nothing logged yet." />

  return (
    <View>
      <Chips className="mt-4">
        <TrendChip label={`All ${lifts.length}`} on={activeTrend === 'all'} onPress={() => setTrend('all')} />
        {TRENDS.filter((t) => counts.has(t)).map((t) => (
          <TrendChip
            key={t}
            label={`${TREND_LABEL[t]} ${counts.get(t)}`}
            on={activeTrend === t}
            onPress={() => setTrend(t)}
          />
        ))}
      </Chips>
      <LiftOverview lifts={shown} trends={byLift} units={units} now={now} />
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
      ) : (
        <>
          <Text accessibilityRole="header" className={cn(H2, 'mt-8')}>
            Recent bests
          </Text>
          <Text className={cn(SECONDARY, 'mt-3')}>None in the last two weeks.</Text>
        </>
      )}
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
