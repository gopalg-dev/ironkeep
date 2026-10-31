import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg from 'react-native-svg'
import { dayAccentClass } from '@/components/day-icon'
import { LineChart } from '@/components/line-chart'
import { TokenPath } from '@/components/svg-tokens'
import { CAPTION, H2, NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { chartDay, chartPosition, timeAxis, valueAxis } from '@/lib/chart-scale'
import { liftTrendDuration, TREND_LABEL, type Trend } from '@/lib/logic/trend'
import { fmtSet, fmtWeight } from '@/lib/logic/units'
import type { Units } from '@/lib/types'
import { bigSet, changeOf, type LiftData, liftValue, weekCell } from './stats-model'

export function LiftOverview({
  lifts,
  trends,
  units,
  now,
}: {
  lifts: LiftData[]
  trends: Map<string, Trend>
  units: Units
  now: Date
}) {
  return (
    <View className="mt-3 gap-2">
      {lifts.map((lift) => (
        <LiftCard key={lift.key} lift={lift} trend={trends.get(lift.key) ?? 'new'} units={units} now={now} />
      ))}
    </View>
  )
}

function LiftCard({ lift, trend, units, now }: { lift: LiftData; trend: Trend; units: Units; now: Date }) {
  const [open, setOpen] = useState(false)
  const { ex, weeks } = lift
  const latest = weeks[weeks.length - 1]
  const big = bigSet(ex.loadType, latest, units, now)
  const recent = weeks.slice(-8)
  const xAxis = timeAxis(recent.map((p) => chartDay(p.date)))
  const yAxis = valueAxis(recent.map((p) => liftValue(ex.loadType, p)))
  const path = recent
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${chartPosition(chartDay(p.date), xAxis.domain, [4, 68])} ${chartPosition(liftValue(ex.loadType, p), yAxis.domain, [28, 4])}`,
    )
    .join(' ')
  const duration = liftTrendDuration(weeks, now)
  return (
    <View className="rounded-xl bg-card p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ex.name}, ${TREND_LABEL[trend]} for ${duration} weeks`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        className="min-h-14 flex-row items-center justify-between gap-3"
      >
        <View className="min-w-0 flex-1">
          <Text className={H2}>{ex.name}</Text>
          <Text
            className={CAPTION}
          >{`${fmtSet(ex.loadType, latest, units)} · ${TREND_LABEL[trend]} ${duration} ${duration === 1 ? 'week' : 'weeks'}`}</Text>
        </View>
        <Svg width={72} height={32} aria-hidden>
          <TokenPath d={path} fill="none" strokeWidth={2} strokeClassName={dayAccentClass(ex.type)} />
        </Svg>
      </Pressable>
      {open ? (
        <View className="mt-3 gap-3">
          <Text className="text-4xl font-condensed-semibold tabular-nums text-foreground">{`${big.value} ${big.unit}`}</Text>
          <Text className={SECONDARY}>{big.line}</Text>
          <LineChart
            points={weeks.map((p) => ({ date: p.date, value: liftValue(ex.loadType, p) }))}
            accentClassName={dayAccentClass(ex.type)}
            minimumStep={ex.loadType === 'weight' ? 0 : 1}
            unit={ex.loadType === 'weight' ? units : ex.loadType === 'time' ? 's' : 'reps'}
            format={ex.loadType === 'weight' ? fmtWeight : String}
            accessibilityLabel={`${ex.name}, ${weeks.length} weeks of history`}
          />
          {weeks
            .slice(-8)
            .reverse()
            .map((point, i, all) => {
              const before = all[i + 1]
              return (
                <View key={point.week} className="flex-row justify-between gap-3">
                  <Text className={CAPTION}>{weekCell(point.week, i)}</Text>
                  <Text className={NUMBER}>{fmtSet(ex.loadType, point, units)}</Text>
                  <Text className={CAPTION}>{before ? changeOf(ex.loadType, before, point, units).text : ''}</Text>
                </View>
              )
            })}
        </View>
      ) : null}
    </View>
  )
}
