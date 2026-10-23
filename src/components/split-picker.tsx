import { Minus, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { CheckOption } from '@/components/check-option'
import { DAY_LABEL, DayIcon } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { Option } from '@/components/option'
import { CAPTION, H3, NUMBER } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { WeekShape } from '@/components/week-shape'
import { type SplitTemplate, splitInfos } from '@/lib/content'
import { buildCustomDays } from '@/lib/day-blocks'
import { must } from '@/lib/must'
import { DAY_TYPES, type DayType, type SplitId } from '@/lib/types'
import { cn } from '@/lib/utils'

/** The id the picker uses for a plan the user lays out day by day. */
export const OWN_SPLIT = 'custom'

/** Two to six days, by type, for a plan of your own. The first draft: a four-day upper and lower. */
export const DEFAULT_OWN_DAYS: DayType[] = ['upper', 'lower', 'upper', 'lower']
export const MAX_OWN_DAYS = 6
export const MIN_OWN_DAYS = 2

/** The tick under the list: the picked split's days with no lifts in them, to fill in on Plan. */
export function EmptyDaysOption({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return <CheckOption checked={checked} onChange={onChange} label="Start with empty days" className={className} />
}

/** The days of a plan of your own: one kind per day, add or take one away. Tap a day to change its kind. */
export function OwnDaysEditor({
  days,
  onChange,
  className,
}: {
  days: DayType[]
  onChange: (days: DayType[]) => void
  className?: string
}) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <View className={cn('gap-2', className)}>
      {days.map((type, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a row is "Day N"; kinds repeat, so the position is the identity
        <View key={i} className="gap-2">
          <View className="flex-row items-center gap-3">
            <Text className={cn(CAPTION, NUMBER, 'w-4')}>{i + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Day ${i + 1}, ${DAY_LABEL[type]}. Change its kind`}
              onPress={() => setOpen(open === i ? null : i)}
              className="h-11 flex-1 flex-row items-center gap-3 rounded-md bg-background px-3"
            >
              <DayIcon type={type} size="sm" />
              <Text className={H3}>{DAY_LABEL[type]}</Text>
            </Pressable>
            <IconButton
              as={Minus}
              tone="ghost"
              accessibilityLabel={`Remove day ${i + 1}`}
              disabled={days.length <= MIN_OWN_DAYS}
              className={cn(days.length <= MIN_OWN_DAYS && 'opacity-40')}
              onPress={() => onChange(days.filter((_, j) => j !== i))}
            />
          </View>
          {open === i ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pl-7">
              {DAY_TYPES.map((t) => {
                const on = t === type
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      onChange(days.map((d, j) => (j === i ? t : d)))
                      setOpen(null)
                    }}
                    className={cn(
                      'h-8.5 flex-row items-center gap-1.5 rounded-full bg-secondary px-3.5',
                      on && 'bg-foreground',
                    )}
                  >
                    <Text className={cn('text-sm font-semibold', on ? 'text-background' : 'text-foreground')}>
                      {DAY_LABEL[t]}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null}
        </View>
      ))}
      <View className="flex-row items-center justify-between gap-3 pl-7">
        <WeekShape days={buildCustomDays(days)} />
        <Button
          variant="ghost"
          size="sm"
          disabled={days.length >= MAX_OWN_DAYS}
          onPress={() => onChange([...days, days[days.length - 1] ?? 'full'])}
        >
          <Icon as={Plus} className="text-foreground" />
          <Text className="font-semibold text-foreground">Add a day</Text>
        </Button>
      </View>
    </View>
  )
}

interface SplitPickerProps {
  splits: SplitTemplate[]
  /** Empty when the plan is custom and nothing is picked yet. */
  value: SplitId | ''
  onChange: (id: SplitId) => void
  ownDays: DayType[]
  onOwnDaysChange: (days: DayType[]) => void
  /** The plan of your own that already exists, if any: "Your own" then means going back to it. */
  ownPlan?: { days: number }
  /** With an existing plan: keep it, or start over from new days. */
  ownMode?: 'keep' | 'build'
  onOwnModeChange?: (mode: 'keep' | 'build') => void
  /** Start the picked split as its days with no lifts. */
  empty: boolean
  onEmptyChange: (empty: boolean) => void
  className?: string
}

/** The templates as a radio list, with "Your own" at the end: pick the days yourself. */
export function SplitPicker({
  splits,
  value,
  onChange,
  ownDays,
  onOwnDaysChange,
  ownPlan,
  ownMode = 'build',
  onOwnModeChange,
  empty,
  onEmptyChange,
  className,
}: SplitPickerProps) {
  const keeping = ownPlan !== undefined && ownMode === 'keep'
  const ownCount = keeping ? ownPlan.days : ownDays.length
  return (
    <View accessibilityRole="radiogroup" className={cn('gap-3', className)}>
      <View className="gap-2">
        {splitInfos(splits).map((s) => (
          <Option
            key={s.id}
            title={s.name}
            detail={`${s.days} days. ${s.fit}`}
            selected={value === s.id}
            onPress={() => onChange(s.id)}
          >
            <WeekShape
              className="mt-3 ml-9"
              days={
                must(
                  splits.find((t) => t.id === s.id),
                  `the ${s.id} template`,
                ).days
              }
            />
          </Option>
        ))}
        <Option
          title="Your own"
          detail={
            keeping
              ? `${ownCount} days. Your plan, as you left it.`
              : empty
                ? `${ownCount} days. Pick a kind for each day.`
                : `${ownCount} days. Pick a kind for each day. Each starts with five lifts to edit.`
          }
          selected={value === OWN_SPLIT}
          onPress={() => onChange(OWN_SPLIT)}
        >
          {value === OWN_SPLIT && !keeping ? (
            <OwnDaysEditor days={ownDays} onChange={onOwnDaysChange} className="mt-4" />
          ) : null}
          {value === OWN_SPLIT && ownPlan && onOwnModeChange ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 self-start"
              onPress={() => onOwnModeChange(keeping ? 'build' : 'keep')}
            >
              <Text className="font-semibold text-muted-foreground">
                {keeping ? 'Start over with new days' : 'Keep the plan I have'}
              </Text>
            </Button>
          ) : null}
        </Option>
      </View>
      {/* Empty days apply to whatever split will be built; only returning to an existing own plan has nothing to empty. */}
      {!(value === OWN_SPLIT && keeping) ? (
        <EmptyDaysOption checked={empty} onChange={onEmptyChange} className="mt-1" />
      ) : null}
    </View>
  )
}
