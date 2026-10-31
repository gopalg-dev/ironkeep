import { useState } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'
import { BarChart } from '@/components/bar-chart'
import { dayColourClass, dayInkClass } from '@/components/day-icon'
import { LineChart } from '@/components/line-chart'
import { Segmented } from '@/components/segmented'
import { TokenRect } from '@/components/svg-tokens'
import { CAPTION, H2, NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { axisNumber, chartDay, valueAxis } from '@/lib/chart-scale'
import { EFFORT_LABEL, EFFORTS } from '@/lib/logic/effort'
import { beforeLabel, type HistoryPoint, type PeriodDay, type PeriodKind, type Report } from '@/lib/logic/report'
import { MUSCLE_LABEL } from '@/lib/logic/stats'
import { fmtWeight } from '@/lib/logic/units'
import type { Units } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ReportCalendar({ days }: { days: PeriodDay[] }) {
  const offset = ((days[0]?.date.getDay() ?? 1) + 6) % 7
  const cells = [
    ...Array.from({ length: offset }, (_, i) => ({ key: `padding-${i}`, day: null })),
    ...days.map((day) => ({ key: day.key, day })),
  ]
  while (cells.length % 7) cells.push({ key: `trailing-${cells.length}`, day: null })
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  return (
    <View className="mt-4 gap-1.5">
      {weeks.map((week) => (
        <View key={week[0].key} className="flex-row gap-1.5">
          {week.map(({ key, day }) => (
            <View
              key={key}
              className={cn(
                'h-10 flex-1 items-center justify-center rounded-sm',
                day?.dayType ? dayColourClass(day.dayType) : 'bg-secondary',
              )}
              accessible
              accessibilityLabel={
                day ? `${day.key}, ${day.dayTypes.length} sessions${day.dayName ? `, ${day.dayName}` : ''}` : undefined
              }
            >
              <Text className={cn(CAPTION, NUMBER, day?.dayType ? dayInkClass(day.dayType) : 'text-foreground')}>
                {day?.date.getDate() ?? ''}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

export function ReportCharts({
  report,
  history,
  kind,
  units,
}: {
  report: Report
  history: HistoryPoint[]
  kind: PeriodKind
  units: Units
}) {
  const [metric, setMetric] = useState<'sessions' | 'sets'>('sessions')
  const muscleAxis = valueAxis(
    report.muscles.flatMap((m) => [m.perWeek, m.prevPerWeek]),
    0,
    true,
  )
  const muscleMaximum = muscleAxis.domain[1]
  const weights = history.flatMap((h) =>
    h.weight === undefined ? [] : [{ date: h.start.toISOString(), value: h.weight }],
  )
  return (
    <View className="mt-6 gap-6">
      <View className="gap-3 rounded-xl bg-card p-4">
        <Text className={H2}>{kind === 'week' ? 'Last 8 weeks' : 'Last 6 months'}</Text>
        <Segmented
          options={[
            { value: 'sessions', label: 'Sessions' },
            { value: 'sets', label: 'Hard sets' },
          ]}
          value={metric}
          onChange={setMetric}
          accessibilityLabel="What the bars count"
        />
        <BarChart
          points={history.map((h) => ({
            key: h.start.toISOString(),
            label: h.label,
            value: h[metric],
            current: h.current,
          }))}
          accessibilityLabel={metric === 'sets' ? 'Hard sets by period' : 'Sessions by period'}
        />
      </View>
      <View className="gap-3 rounded-xl bg-card p-4">
        <Text className={H2}>{`Hard sets${kind === 'month' ? ' a week' : ''} per muscle`}</Text>
        <Text className={CAPTION}>{`This period / ${beforeLabel(kind)}`}</Text>
        <View className="flex-row justify-between">
          {muscleAxis.ticks.map((tick) => (
            <Text key={tick} className={CAPTION}>
              {axisNumber(tick, muscleAxis.step)}
            </Text>
          ))}
        </View>
        {report.muscles.map((m) => {
          const max = muscleMaximum
          return (
            <View
              key={m.muscle}
              className="gap-1"
              accessible
              accessibilityLabel={`${MUSCLE_LABEL[m.muscle]}, ${m.perWeek} sets, previously ${m.prevPerWeek}, target ${m.target}`}
            >
              <View className="flex-row justify-between">
                <Text className={SECONDARY}>{MUSCLE_LABEL[m.muscle]}</Text>
                <Text className={cn(CAPTION, NUMBER)}>{`${fmtWeight(m.perWeek)} / ${fmtWeight(m.prevPerWeek)}`}</Text>
              </View>
              <Svg width="100%" height={18}>
                <TokenRect width={`${(m.perWeek / max) * 100}%`} height={7} rx={2} fillClassName="accent-primary" />
                <TokenRect
                  y={10}
                  width={`${(m.prevPerWeek / max) * 100}%`}
                  height={7}
                  rx={2}
                  fillClassName="accent-muted-foreground"
                />
              </Svg>
            </View>
          )
        })}
      </View>
      <View className="gap-3 rounded-xl bg-card p-4">
        <Text className={H2}>Effort</Text>
        {EFFORTS.map((effort, i) => (
          <View key={effort} className="flex-row justify-between">
            <Text className={SECONDARY}>{EFFORT_LABEL[effort]}</Text>
            <Text
              className={NUMBER}
            >{`${report.effort.counts[i]}, ${beforeLabel(kind)} ${report.effort.prevCounts[i]}`}</Text>
          </View>
        ))}
        {report.effort.left !== undefined ? (
          <Text
            className={SECONDARY}
          >{`${report.effort.left} reps left on last sets${report.effort.prevLeft !== undefined ? `, previously ${report.effort.prevLeft}` : ''}`}</Text>
        ) : null}
      </View>
      {weights.length > 0 ? (
        <View className="gap-3 rounded-xl bg-card p-4">
          <Text className={H2}>Bodyweight</Text>
          <LineChart
            points={weights}
            unit={units}
            timeDomain={
              history.length > 1 ? [chartDay(history[0].start), chartDay(history[history.length - 1].start)] : undefined
            }
            format={fmtWeight}
            accessibilityLabel="Bodyweight by report period"
          />
        </View>
      ) : null}
    </View>
  )
}
