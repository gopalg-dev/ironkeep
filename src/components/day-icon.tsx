import {
  Activity,
  BicepsFlexed,
  ChevronsDown,
  ChevronsUp,
  HeartPulse,
  Hexagon,
  Layers,
  type LucideIcon,
  Mountain,
  MoveDown,
  MoveUp,
  PersonStanding,
} from 'lucide-react-native'
import { View } from 'react-native'

import { Icon } from '@/components/ui/icon'
import type { DayType } from '@/lib/types'
import { cn } from '@/lib/utils'

export { DAY_LABEL } from '@/lib/day-blocks'

export type Family = 'push' | 'pull' | 'legs' | 'mixed'

/** Plate colours follow the family: red for pushing, blue for pulling, yellow for legs, neutral for the rest. */
export const DAY_FAMILY: Record<DayType, Family> = {
  push: 'push',
  chest: 'push',
  shoulders: 'push',
  pull: 'pull',
  back: 'pull',
  legs: 'legs',
  lower: 'legs',
  upper: 'mixed',
  full: 'mixed',
  arms: 'mixed',
  core: 'mixed',
}

const colour: Record<Family, string> = {
  push: 'bg-day-push',
  pull: 'bg-day-pull',
  legs: 'bg-day-legs',
  mixed: 'bg-day-mixed',
}

/** Ink on top of each plate colour: a token, so a theme with a light plate can darken it. */
const ink: Record<Family, string> = {
  push: 'text-day-push-ink',
  pull: 'text-day-pull-ink',
  legs: 'text-day-legs-ink',
  mixed: 'text-day-mixed-ink',
}

/** The `accent-` form of the plate colour, for SVG strokes and fills through `withUniwind`. */
const accent: Record<Family, string> = {
  push: 'accent-day-push',
  pull: 'accent-day-pull',
  legs: 'accent-day-legs',
  mixed: 'accent-day-mixed',
}

const inkAccent: Record<Family, string> = {
  push: 'accent-day-push-ink',
  pull: 'accent-day-pull-ink',
  legs: 'accent-day-legs-ink',
  mixed: 'accent-day-mixed-ink',
}

/** A glyph per day type: what the session is about, at a glance. */
/** Lucide stand-ins until the custom day glyphs exist; the less dated of the set (the IconsLucide board shows the rest). */
const icon: Record<DayType, LucideIcon> = {
  push: ChevronsUp,
  pull: ChevronsDown,
  legs: PersonStanding,
  upper: MoveUp,
  lower: MoveDown,
  full: Activity,
  chest: HeartPulse,
  back: Layers,
  shoulders: Mountain,
  arms: BicepsFlexed,
  core: Hexagon,
}

/** The plate colour as a border, for an outline in the day's colour. */
const border: Record<Family, string> = {
  push: 'border-day-push',
  pull: 'border-day-pull',
  legs: 'border-day-legs',
  mixed: 'border-day-mixed',
}

export const dayColourClass = (type: DayType): string => colour[DAY_FAMILY[type]]
export const dayBorderClass = (type: DayType): string => border[DAY_FAMILY[type]]
export const dayInkClass = (type: DayType): string => ink[DAY_FAMILY[type]]
export const dayAccentClass = (type: DayType): string => accent[DAY_FAMILY[type]]

/** The plate colour and its ink as `accent-` classes by family, for figures coloured by muscle rather than by day. */
export const familyColourClass = (family: Family): string => colour[family]
export const familyAccentClass = (family: Family): string => accent[family]
export const familyInkAccentClass = (family: Family): string => inkAccent[family]
/** A day type of each family, for a tile that stands for the family itself. */
export const FAMILY_DAY: Record<Family, DayType> = { push: 'push', pull: 'pull', legs: 'legs', mixed: 'full' }

type Size = 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { tile: string; icon: string }> = {
  sm: { tile: 'size-7 rounded-lg', icon: 'size-4' },
  md: { tile: 'size-9 rounded-sm', icon: 'size-5' },
  lg: { tile: 'size-11 rounded-md', icon: 'size-6' },
}

/**
 * A plate-coloured tile with the day's glyph, for lists and titles. Red is push, blue is pull,
 * yellow is legs, grey is a mixed day. Lucide glyphs until the custom pictures are chosen.
 */
export function DayIcon({ type, size = 'md', className }: { type: DayType; size?: Size; className?: string }) {
  return (
    <View aria-hidden className={cn('items-center justify-center', dayColourClass(type), SIZE[size].tile, className)}>
      <Icon as={icon[type]} strokeWidth={2} className={cn(dayInkClass(type), SIZE[size].icon)} />
    </View>
  )
}
