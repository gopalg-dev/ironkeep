import { Plus } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { instantOf } from '@/components/day-field'
import { EmptyState } from '@/components/empty-state'
import { LineChart } from '@/components/line-chart'
import { MeasurementDialog } from '@/components/measurement-dialog'
import { Segmented } from '@/components/segmented'
import { BIG_NUMBER, CAPTION, HERO_FONT_CAP, MID_NUMBER, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { StatsData } from '@/db/repo'
import * as repo from '@/db/repo'
import { LogWeightDialog } from '@/features/today/log-weight-dialog'
import { announce } from '@/lib/announce'
import { CHART_DAY, chartDay } from '@/lib/chart-scale'
import { signed } from '@/lib/format'
import { bodyweightTrend } from '@/lib/logic/stats'
import { fmtWeight } from '@/lib/logic/units'
import type { MeasurementLog } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LogTapeDialog } from './log-tape-dialog'
import {
  bodyweightLine,
  latestTapes,
  lengthUnit,
  RANGE_LABEL,
  RANGES,
  type Range,
  TAPE_LABEL,
  TAPES,
  type Tape,
  tapeLine,
  tapePoints,
  weighInsIn,
} from './stats-model'

type Panel = 'weigh' | 'tape'
const TAPE_ACCENT: Record<Tape, string> = {
  arm: 'accent-chart-2',
  chest: 'accent-chart-1',
  waist: 'accent-chart-3',
}

/**
 * Body (canvas: Stats body): the latest weigh-in with its weekly average and a line over 4 weeks, 12
 * or all; the tape's latest arm, chest and waist, when it is next due, and one tape's line. Log on
 * each card.
 */
export function BodyPanel({
  data,
  onChanged,
  openTape = false,
}: {
  data: StatsData
  onChanged: () => Promise<void>
  openTape?: boolean
}) {
  const now = new Date()
  const { settings, bodyweights, measurements } = data
  const units = settings.units
  const [panel, setPanel] = useState<Panel | null>(null)
  const [pickedTape, setPickedTape] = useState<MeasurementLog | null>(null)
  const [tapeRange, setTapeRange] = useState('365')
  useEffect(() => {
    if (openTape) setPanel('tape')
  }, [openTape])
  const [range, setRange] = useState<Range>('12')
  const [tape, setTape] = useState<Tape>('arm')
  const trend = bodyweightTrend(bodyweights, now)
  const weightLine = bodyweightLine(trend)
  const points = weighInsIn(bodyweights, range, now)
  const latest = latestTapes(measurements)
  const last = measurements[measurements.length - 1]
  const tapeWords = tapeLine(last, now)
  const tapeSeries = tapePoints(
    measurements.filter(
      (m) => tapeRange === 'all' || new Date(m.date).getTime() >= now.getTime() - Number(tapeRange) * 86400000,
    ),
    tape,
  )
  const unit = lengthUnit(units)
  const close = () => setPanel(null)

  return (
    <View>
      <View className="mt-4 rounded-xl bg-card px-4 pt-5 pb-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="shrink">
            <Text className={SECONDARY}>Bodyweight</Text>
            {trend.latest !== undefined ? (
              <View className="flex-row items-baseline">
                <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={BIG_NUMBER}>
                  {fmtWeight(trend.latest)}
                </Text>
                <Text className="ml-1 text-lg font-semibold text-muted-foreground">{units}</Text>
              </View>
            ) : null}
            {weightLine ? <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>{weightLine}</Text> : null}
          </View>
          <Button variant="secondary" className={BTN_SM2} onPress={() => setPanel('weigh')}>
            <Icon as={Plus} className="size-4.5 text-foreground" />
            <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Log</Text>
          </Button>
        </View>
        {bodyweights.length > 0 ? (
          <>
            <Segmented
              inverted
              className="mt-4"
              options={RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
              value={range}
              onChange={setRange}
              accessibilityLabel="Bodyweight range"
            />
            <View className="mt-3">
              <LineChart
                points={points}
                unit={units}
                timeDomain={
                  range === 'all' ? undefined : [chartDay(now) - Number(range) * 7 * CHART_DAY, chartDay(now)]
                }
                heightClassName="h-40"
                accentClassName="accent-chart-1"
                format={fmtWeight}
                accessibilityLabel={`Bodyweight, ${RANGE_LABEL[range].toLowerCase()}: ${fmtWeight(points[0]?.value)} to ${fmtWeight(points[points.length - 1]?.value)} ${units}`}
              />
            </View>
          </>
        ) : (
          <EmptyState small illustration="body" line="Nothing logged yet." />
        )}
      </View>

      <View className="mt-2 rounded-xl bg-card px-4 pt-5 pb-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className={SECONDARY}>Measurements</Text>
          <Button variant="secondary" className={BTN_SM2} onPress={() => setPanel('tape')}>
            <Icon as={Plus} className="size-4.5 text-foreground" />
            <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Log</Text>
          </Button>
        </View>
        {measurements.length > 0 ? (
          <>
            <View className="mt-2 flex-row gap-2">
              {TAPES.map((t) => (
                <View key={t} className="flex-1 gap-1">
                  <View className="flex-row items-baseline">
                    <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={cn(MID_NUMBER, 'text-3xl')}>
                      {latest[t] !== undefined ? fmtWeight(latest[t]) : '–'}
                    </Text>
                    {latest[t] !== undefined ? (
                      <Text className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</Text>
                    ) : null}
                  </View>
                  <Text className={CAPTION}>{TAPE_LABEL[t]}</Text>
                  {last?.[t] !== undefined && measurements[measurements.length - 2]?.[t] !== undefined ? (
                    <Text
                      className={CAPTION}
                    >{`${signed(last[t] - (measurements[measurements.length - 2]?.[t] ?? 0), 1)} vs last`}</Text>
                  ) : null}
                </View>
              ))}
            </View>
            {tapeWords ? <Text className={cn(SECONDARY, NUMBER, 'mt-3')}>{tapeWords}</Text> : null}
            <Segmented
              inverted
              className="mt-4"
              options={TAPES.map((t) => ({ value: t, label: TAPE_LABEL[t] }))}
              value={tape}
              onChange={setTape}
              accessibilityLabel="Measurement"
            />
            <Segmented
              className="mt-3"
              options={[
                { value: '182', label: '6 months' },
                { value: '365', label: '1 year' },
                { value: 'all', label: 'All' },
              ]}
              value={tapeRange}
              onChange={setTapeRange}
              accessibilityLabel="Tape chart range"
            />
            {tapeSeries.length > 0 ? (
              <View className="mt-3">
                <LineChart
                  points={tapeSeries}
                  unit={unit}
                  timeDomain={
                    tapeRange === 'all' ? undefined : [chartDay(now) - Number(tapeRange) * CHART_DAY, chartDay(now)]
                  }
                  onPick={(point) => setPickedTape(measurements.find((m) => m.date === point.date) ?? null)}
                  heightClassName="h-35"
                  accentClassName={TAPE_ACCENT[tape]}
                  format={fmtWeight}
                  accessibilityLabel={`${TAPE_LABEL[tape]}: ${fmtWeight(tapeSeries[0]?.value)} to ${fmtWeight(tapeSeries[tapeSeries.length - 1]?.value)} ${unit}`}
                />
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState small illustration="measurements" line="Nothing logged yet." />
        )}
      </View>

      <MeasurementDialog log={pickedTape} onClose={() => setPickedTape(null)} onChanged={onChanged} unit={unit} />
      <LogWeightDialog
        open={panel === 'weigh'}
        onClose={close}
        units={units}
        initial={trend.latest ?? settings.bodyweight}
        onSave={(w, day) =>
          void repo
            .logBodyweight(w, day, instantOf(day))
            .then(onChanged)
            .then(() => announce('Bodyweight saved'))
        }
      />
      <LogTapeDialog
        open={panel === 'tape'}
        onClose={close}
        unit={unit}
        initial={latest}
        onSave={(m, day) =>
          void repo
            .logMeasurement(m, day, instantOf(day))
            .then(onChanged)
            .then(() => announce('Measurements saved'))
        }
      />
    </View>
  )
}
