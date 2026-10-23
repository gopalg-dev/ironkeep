import { useState } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'

import { type Family, familyAccentClass, familyColourClass } from '@/components/day-icon'
import { TokenPolygon } from '@/components/svg-tokens'
import { CAPTION } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { BACK_FIGURE, BODY_VIEWBOX, type BodyFigure, FRONT_FIGURE } from '@/lib/body-figures'
import type { Muscle } from '@/lib/types'
import { cn } from '@/lib/utils'
import { type HardSetRow, type MapState, MUSCLE_FAMILY, mapState } from './stats-model'

/** How much of the colour a muscle keeps when only part of its sets are done. */
export const PARTLY = 0.35
/** The seams between parts, in the card's colour, so the figure reads as a body and not a blob (in the figure's 1000-wide box). */
const SEAM = 6

/** What a muscle is painted: the family's plate colour in full or in part, the surface while planned, the border when not in the plan. */
function paintOf(state: MapState, family: Family): { fill: string; opacity: number } {
  if (state === 'trained') return { fill: familyAccentClass(family), opacity: 1 }
  if (state === 'partly') return { fill: familyAccentClass(family), opacity: PARTLY }
  if (state === 'planned') return { fill: 'accent-secondary', opacity: 1 }
  return { fill: 'accent-border', opacity: 1 }
}

const LEGEND: { state: MapState; label: string }[] = [
  { state: 'trained', label: 'Trained' },
  { state: 'partly', label: 'Partly' },
  { state: 'planned', label: 'Planned, not yet' },
  { state: 'off', label: 'Not in the plan' },
]

/** The legend swatch's colour: the pull plate stands for "a colour", the rest are the surfaces. */
function swatchClass(state: MapState): string {
  if (state === 'trained' || state === 'partly') return familyColourClass('pull')
  return state === 'planned' ? 'bg-secondary' : 'bg-border'
}

/**
 * The week's hard sets on two figures (canvas: Stats sessions, the body map card): front and back,
 * the figures of react-body-highlighter (`lib/body-figures.ts`), each muscle a region in its
 * family's plate colour by what was done against the plan. The numbers sit in the bars under it.
 */
export function BodyMap({
  rows,
  picked,
  onPick,
  className,
}: {
  rows: HardSetRow[]
  /** The muscle picked on the figures or in the bars under them: outlined here, its bar lit there. */
  picked: Muscle | null
  onPick: (m: Muscle) => void
  className?: string
}) {
  const byMuscle = new Map(rows.map((r) => [r.muscle, r]))
  const stateOf = (m: Muscle): MapState => {
    const r = byMuscle.get(m)
    return mapState(r?.done ?? 0, r?.planned ?? 0)
  }
  return (
    <View className={cn('rounded-xl bg-card px-4 pt-4 pb-3', className)}>
      <View
        className="flex-row justify-center gap-4"
        accessibilityRole="image"
        accessibilityLabel="Body map, front and back, coloured by hard sets done against the plan"
      >
        <Figure figure={FRONT_FIGURE} caption="Front" stateOf={stateOf} picked={picked} onPick={onPick} />
        <Figure figure={BACK_FIGURE} caption="Back" stateOf={stateOf} picked={picked} onPick={onPick} />
      </View>
      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
        {LEGEND.map((l) => (
          <View key={l.state} className="flex-row items-center gap-1.5">
            <View
              className={cn('size-3 rounded-sm', swatchClass(l.state))}
              style={l.state === 'partly' ? { opacity: PARTLY } : undefined}
              accessibilityElementsHidden
            />
            <Text className={CAPTION}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/** The outline of the picked muscle, in the figure's 1000-wide box. */
const PICK = 12

/** One figure: the body's own parts in the quiet colour, each tracked muscle's regions in its paint; a tap on a region picks it. */
function Figure({
  figure,
  caption,
  stateOf,
  picked,
  onPick,
}: {
  figure: BodyFigure
  caption: string
  stateOf: (m: Muscle) => MapState
  picked: Muscle | null
  onPick: (m: Muscle) => void
}) {
  const muscles = Object.keys(figure.regions) as Muscle[]
  const [width, setWidth] = useState(0)
  return (
    <View className="flex-1 items-center gap-2" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={width * 2.2} viewBox={BODY_VIEWBOX}>
          {figure.body.map((points) => (
            <TokenPolygon
              key={points}
              points={points}
              fillClassName="accent-secondary"
              strokeClassName="accent-card"
              strokeWidth={SEAM}
              strokeLinejoin="round"
            />
          ))}
          {muscles.map((m) => {
            const paint = paintOf(stateOf(m), MUSCLE_FAMILY[m])
            const on = picked === m
            return (figure.regions[m] ?? []).map((points) => (
              <TokenPolygon
                key={points}
                points={points}
                fillClassName={paint.fill}
                fillOpacity={paint.opacity}
                strokeClassName={on ? 'accent-foreground' : 'accent-card'}
                strokeWidth={on ? PICK : SEAM}
                strokeLinejoin="round"
                onPress={() => onPick(m)}
              />
            ))
          })}
        </Svg>
      ) : null}
      <Text className={CAPTION}>{caption}</Text>
    </View>
  )
}
