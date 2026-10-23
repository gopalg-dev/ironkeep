import { useState } from 'react'
import { Pressable } from 'react-native'
import Svg from 'react-native-svg'
import { useResolveClassNames } from 'uniwind'

import { axisTicks } from '@/components/chart-scale'
import { TokenCircle, TokenLine, TokenPath, TokenText } from '@/components/svg-tokens'
import { shortDate } from '@/lib/format'

export interface ChartPoint {
  /** ISO date, used for the axis labels. */
  date: string
  value: number
}

interface LineChartProps {
  points: ChartPoint[]
  /** The chart's height class, from the spacing scale (the boards: h-40 for a lift and bodyweight, h-35 for the tape). */
  heightClassName?: string
  /** The line's colour, as an `accent-` class: the day's plate colour for a lift, ink for the body. */
  accentClassName?: string
  /** Writes a value: beside the picked point and down the scale. */
  format?: (value: number) => string
  accessibilityLabel?: string
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback)

/**
 * One line over time (canvas: the Stats charts), drawn with react-native-svg as the web's Recharts
 * draws it: a value scale down the left with a dashed gridline per round tick, the line in its
 * colour, a dot with its value on the latest point, the first and last dates under it. A tap moves
 * the dot and its value to the nearest point. No Skia, no Reanimated.
 */
export function LineChart({
  points,
  heightClassName = 'h-40',
  accentClassName = 'accent-primary',
  format = (v) => String(v),
  accessibilityLabel,
}: LineChartProps) {
  const [width, setWidth] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  // Sizes from the scale: the chart's height, the scale's column, the side padding, the room above for the value and below for the dates.
  const box = useResolveClassNames(heightClassName)
  const scale = useResolveClassNames('w-10')
  const pad = useResolveClassNames('p-2')
  const top = useResolveClassNames('pt-5')
  const axis = useResolveClassNames('pb-4')
  const label = useResolveClassNames('text-xs')
  const height = num(box.height, 160)
  const axisW = num(scale.width, 40)
  const padX = num(pad.padding, 8)
  const padTop = num(top.paddingTop, 20)
  const axisH = num(axis.paddingBottom, 16)
  const fontSize = num(label.fontSize, 12)

  const at = picked ?? points.length - 1
  const plotH = height - padTop - axisH
  const plotW = width - axisW - padX
  const values = points.map((p) => p.value)
  const ticks = axisTicks(Math.min(...values), Math.max(...values))
  const lo = ticks[0] ?? 0
  const hi = ticks[ticks.length - 1] ?? 1
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0
  // One point alone sits in the middle of the plot.
  const x = (i: number) => (points.length > 1 ? axisW + i * stepX : axisW + plotW / 2)
  const y = (v: number) => padTop + (1 - (v - lo) / (hi - lo || 1)) * plotH
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const current = points[at]
  const first = points[0]
  const last = points[points.length - 1]
  const valueX = points.length === 1 ? x(at) : at === points.length - 1 ? x(at) - padX : at === 0 ? x(at) + padX : x(at)
  const valueAnchor = points.length === 1 ? 'middle' : at === points.length - 1 ? 'end' : at === 0 ? 'start' : 'middle'

  const pick = (locationX: number) => {
    if (stepX === 0) return
    const i = Math.max(0, Math.min(points.length - 1, Math.round((locationX - axisW) / stepX)))
    setPicked(i)
  }

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => pick(e.nativeEvent.locationX)}
      className={heightClassName}
    >
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <TokenLine
              key={t}
              x1={axisW}
              x2={width}
              y1={y(t)}
              y2={y(t)}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeClassName="accent-border"
            />
          ))}
          {ticks.map((t) => (
            <TokenText
              key={t}
              x={axisW - padX / 2}
              y={y(t) + fontSize * 0.35}
              fontSize={fontSize}
              fontWeight="500"
              textAnchor="end"
              fillClassName="accent-muted-foreground"
            >
              {format(t)}
            </TokenText>
          ))}
          <TokenPath
            d={d}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeClassName={accentClassName}
          />
          {current ? (
            <>
              <TokenCircle cx={x(at)} cy={y(current.value)} r={5} fillClassName={accentClassName} />
              <TokenText
                x={valueX}
                y={Math.max(fontSize, y(current.value) - padX - 2)}
                fontSize={fontSize}
                fontWeight="700"
                textAnchor={valueAnchor}
                fillClassName="accent-foreground"
              >
                {format(current.value)}
              </TokenText>
            </>
          ) : null}
          {first ? (
            <TokenText
              x={points.length > 1 ? axisW : x(0)}
              y={height - 2}
              fontSize={fontSize}
              fontWeight="500"
              textAnchor={points.length > 1 ? 'start' : 'middle'}
              fillClassName="accent-muted-foreground"
            >
              {shortDate(first.date)}
            </TokenText>
          ) : null}
          {last && points.length > 1 ? (
            <TokenText
              x={width - padX}
              y={height - 2}
              fontSize={fontSize}
              fontWeight="500"
              textAnchor="end"
              fillClassName="accent-muted-foreground"
            >
              {shortDate(last.date)}
            </TokenText>
          ) : null}
        </Svg>
      ) : null}
    </Pressable>
  )
}
