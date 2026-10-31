import { useState } from 'react'
import { Pressable, useWindowDimensions } from 'react-native'
import Svg from 'react-native-svg'
import { useResolveClassNames } from 'uniwind'
import { TokenCircle, TokenLine, TokenPath, TokenText } from '@/components/svg-tokens'
import { CAPTION, NUMBER } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { axisDate, axisLabelWidth, axisNumber, chartDay, chartPosition, timeAxis, valueAxis } from '@/lib/chart-scale'
import { longDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ChartPoint {
  date: string
  value: number
}
interface LineChartProps {
  points: ChartPoint[]
  heightClassName?: string
  accentClassName?: string
  format?: (value: number) => string
  accessibilityLabel?: string
  onPick?: (point: ChartPoint) => void
  /** Selected calendar window; sparse observations must not shrink it. */
  timeDomain?: [number, number]
  minimumStep?: number
  unit?: string
}
const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback)

/** Linear date/value scales, round grid ticks and a selection that never changes either domain. */
export function LineChart({
  points,
  heightClassName = 'h-40',
  accentClassName = 'accent-primary',
  format = String,
  accessibilityLabel,
  onPick,
  timeDomain,
  minimumStep = 0,
  unit = '',
}: LineChartProps) {
  const [width, setWidth] = useState(0)
  const [picked, setPicked] = useState<ChartPoint | null>(null)
  const { fontScale } = useWindowDimensions()
  const box = useResolveClassNames(heightClassName)
  const label = useResolveClassNames('text-xs')
  const height = num(box.height, 160) * Math.max(1, fontScale)
  const fontSize = num(label.fontSize, 12) * fontScale
  const rows = points
    .filter((p) => Number.isFinite(p.value) && Number.isFinite(chartDay(p.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((p) => !timeDomain || (chartDay(p.date) >= timeDomain[0] && chartDay(p.date) <= timeDomain[1]))
  const yAxis = valueAxis(
    rows.map((p) => p.value),
    minimumStep,
    false,
    fontScale > 1.3 ? 3 : 5,
  )
  const labels = yAxis.ticks.map((t) => axisNumber(t, yAxis.step))
  const axisW = axisLabelWidth(yAxis, fontSize)
  const right = Math.max(axisW, width - 12)
  const bottom = height - fontSize - 12
  const top = fontSize / 2 + 6
  const xAxis = timeAxis(
    rows.map((p) => chartDay(p.date)),
    timeDomain?.[0],
    timeDomain?.[1],
    Math.max(2, Math.floor((right - axisW) / (fontSize * 7)) + 1),
  )
  const x = (p: ChartPoint) => chartPosition(chartDay(p.date), xAxis.domain, [axisW, right])
  const y = (v: number) => chartPosition(v, yAxis.domain, [bottom, top])
  const index = picked ? rows.findIndex((p) => p.date === picked.date && p.value === picked.value) : -1
  const at = index < 0 ? rows.length - 1 : index
  const current = rows[at]
  const currentLabel = current ? `${longDate(current.date)} · ${format(current.value)}${unit ? ` ${unit}` : ''}` : ''
  const path = rows.map((p, i) => `${i ? 'L' : 'M'}${x(p)} ${y(p.value)}`).join(' ')
  const select = (point: ChartPoint | undefined, activate = false) => {
    if (!point) return
    setPicked(point)
    if (activate) onPick?.(point)
  }
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: current ? `${longDate(current.date)}, ${format(current.value)} ${unit}` : 'No data' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'activate') select(current, true)
        else
          select(rows[Math.max(0, Math.min(rows.length - 1, at + (nativeEvent.actionName === 'increment' ? 1 : -1)))])
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        const location = e.nativeEvent.locationX
        select(
          rows.reduce<ChartPoint | undefined>(
            (best, p) => (!best || Math.abs(x(p) - location) < Math.abs(x(best) - location) ? p : best),
            undefined,
          ),
          true,
        )
      }}
      className="min-w-0"
    >
      <Text className={cn(CAPTION, NUMBER, 'mb-2')}>{currentLabel || 'No data in this range'}</Text>
      {width > axisW && rows.length > 0 ? (
        <Svg width={width} height={height}>
          {yAxis.ticks.map((t) => (
            <TokenLine
              key={t}
              x1={axisW}
              x2={right}
              y1={y(t)}
              y2={y(t)}
              strokeWidth={1}
              strokeClassName="accent-border"
            />
          ))}
          {yAxis.ticks.map((t, i) => (
            <TokenText
              key={t}
              x={axisW - 8}
              y={y(t) + fontSize * 0.35}
              fontSize={fontSize}
              textAnchor="end"
              fillClassName="accent-muted-foreground"
            >
              {labels[i]}
            </TokenText>
          ))}
          {xAxis.ticks.map((t) => (
            <TokenText
              key={t}
              x={chartPosition(t, xAxis.domain, [axisW, right])}
              y={height - 2}
              fontSize={fontSize}
              textAnchor={t === xAxis.domain[0] ? 'start' : t === xAxis.domain[1] ? 'end' : 'middle'}
              fillClassName="accent-muted-foreground"
            >
              {axisDate(t, xAxis.domain)}
            </TokenText>
          ))}
          <TokenPath
            d={path}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeClassName={accentClassName}
          />
          {current ? (
            <>
              <TokenLine
                x1={x(current)}
                x2={x(current)}
                y1={top}
                y2={bottom}
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeClassName="accent-muted-foreground"
              />
              <TokenCircle cx={x(current)} cy={y(current.value)} r={5} fillClassName={accentClassName} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </Pressable>
  )
}
