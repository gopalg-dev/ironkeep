import { useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import Svg from 'react-native-svg'
import { TokenLine, TokenRect, TokenText } from '@/components/svg-tokens'
import { axisNumber, valueAxis } from '@/lib/chart-scale'

interface BarPoint {
  key: string
  label: string
  value: number
  current: boolean
}

/** Period categories share one zero baseline and one labelled value axis. */
export function BarChart({ points, accessibilityLabel }: { points: BarPoint[]; accessibilityLabel: string }) {
  const [width, setWidth] = useState(0)
  const { fontScale } = useWindowDimensions()
  const fontSize = 12 * fontScale
  const axis = valueAxis(
    points.map((p) => p.value),
    1,
    true,
    fontScale > 1.3 ? 3 : 5,
  )
  const labels = axis.ticks.map((t) => axisNumber(t, axis.step))
  const left = Math.max(32, ...labels.map((text) => text.length * fontSize * 0.58 + 10))
  const plot = Math.max(0, width - left - 8)
  const column = plot / Math.max(1, points.length)
  const y = (v: number) => (116 - (v / axis.domain[1]) * 104) * fontScale
  const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(plot / (fontSize * 6)))))
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${accessibilityLabel}: ${points.map((p) => `${p.label}, ${p.value}`).join('; ')}`}
    >
      <Svg width={width} height={144 * fontScale}>
        {axis.ticks.map((tick, i) => (
          <TokenText
            key={tick}
            x={left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize={fontSize}
            fillClassName="accent-muted-foreground"
          >
            {labels[i]}
          </TokenText>
        ))}
        {axis.ticks.map((tick) => (
          <TokenLine
            key={tick}
            x1={left}
            x2={width - 8}
            y1={y(tick)}
            y2={y(tick)}
            strokeWidth={1}
            strokeClassName="accent-border"
          />
        ))}
        {points.map((point, i) => (
          <TokenRect
            key={point.key}
            x={left + column * (i + 0.2)}
            y={y(point.value)}
            width={column * 0.6}
            height={116 * fontScale - y(point.value)}
            rx={3}
            fillClassName={point.current ? 'accent-primary' : 'accent-muted-foreground'}
          />
        ))}
        {points
          .filter((_, i) => i % every === 0)
          .map((point) => (
            <TokenText
              key={point.key}
              x={left + column * (points.indexOf(point) + 0.5)}
              y={138 * fontScale}
              textAnchor="middle"
              fontSize={fontSize}
              fillClassName="accent-muted-foreground"
            >
              {point.label}
            </TokenText>
          ))}
      </Svg>
    </View>
  )
}
