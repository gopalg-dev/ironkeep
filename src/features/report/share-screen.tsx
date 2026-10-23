import { useRouter } from 'expo-router'
import { Check, Share2, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Share, View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Chip, Chips } from '@/components/chip'
import { dayColourClass } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { SheetBody } from '@/components/sheet'
import { BODY, CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { highlights, type ShareCardContent, shareCardContent } from '@/lib/logic/share-card'
import { cn } from '@/lib/utils'
import { getShare } from './share-handoff'

type Look = 'ink' | 'paper'

/** The card as a message, for the share sheet's text slot. */
export function cardText(card: ShareCardContent): string {
  const lines = [card.title, `${card.sessions.value} ${card.sessions.label}`]
  if (card.sessions.change) lines.push(card.sessions.change)
  if (card.win) lines.push(`${card.win.caption}: ${card.win.big}, ${card.win.small}`)
  if (card.bodyweight)
    lines.push(`Bodyweight ${card.bodyweight.value}${card.bodyweight.change ? `, ${card.bodyweight.change}` : ''}`)
  lines.push('IronKeep')
  return lines.join('\n')
}

/**
 * The share card (canvas: Report, share): a preview, the look, the highlight to put on it, whether
 * the bodyweight goes on, and Share, which hands the card's words to the phone's share sheet. The
 * `/share` sheet, from the Report.
 */
export function ShareScreen() {
  const router = useRouter()
  const handoff = getShare()
  const [look, setLook] = useState<Look>('ink')
  const [highlight, setHighlight] = useState<string | undefined>(undefined)
  const [withBodyweight, setWithBodyweight] = useState(false)
  if (!handoff) return <SheetBody>{null}</SheetBody>
  const { report, period, days, units } = handoff
  const options = highlights(report, period, units)
  const card = {
    ...shareCardContent(report, period, days, units, 'Your', { bodyweight: withBodyweight, highlight }),
    who: '',
  }
  const unit = period.kind === 'week' ? 'week' : 'month'
  const ink = look === 'ink'
  const fg = ink ? 'text-background' : 'text-foreground'
  const dim = ink ? 'text-background opacity-70' : 'text-muted-foreground'

  return (
    <SheetBody>
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className={H2}>{`Share your ${unit}`}</Text>
        <IconButton as={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <View className="items-center">
        <View
          accessibilityRole="image"
          accessibilityLabel="Share card preview"
          className={cn(
            'h-67.5 w-54 justify-between rounded-xl p-5',
            ink ? 'bg-foreground' : 'border border-border bg-card',
          )}
        >
          <View className="gap-1">
            <Text className={cn('text-xs font-semibold', dim)}>{card.title}</Text>
            <View className="flex-row items-baseline">
              <Text className={cn('text-5xl font-condensed-semibold leading-none tabular-nums', fg)}>
                {card.sessions.value}
              </Text>
              <Text className={cn('ml-1.5 text-base font-semibold', dim)}>{card.sessions.label}</Text>
            </View>
            <View className="mt-1 flex-row gap-1">
              {days.map((d) => (
                <View
                  key={d.key}
                  className={cn(
                    'h-1.5 flex-1 rounded-sm',
                    d.dayType ? dayColourClass(d.dayType) : ink ? 'bg-background opacity-30' : 'bg-secondary',
                  )}
                />
              ))}
            </View>
          </View>
          {card.win ? (
            <View className="gap-1">
              <Text className={cn('text-xs font-semibold', dim)}>{card.win.caption}</Text>
              <Text className={cn('text-2xl font-condensed-semibold', fg)} numberOfLines={2}>
                {card.win.big}
              </Text>
              <Text className={cn('text-xs font-semibold', dim)}>{card.win.small}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className={cn('text-xs font-bold', fg)}>IronKeep</Text>
            <Text className={cn('text-xs font-semibold', dim)}>
              {card.bodyweight ? `${card.bodyweight.value} ${units}` : `${report.sets.now} hard sets`}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row justify-center gap-3">
        <Swatch label="Ink" on={look === 'ink'} className="bg-foreground" onPress={() => setLook('ink')} />
        <Swatch
          label="Paper"
          on={look === 'paper'}
          className="border border-border bg-card"
          onPress={() => setLook('paper')}
        />
      </View>
      <View className="gap-2">
        <Text className={cn(CAPTION, 'px-1')}>Highlight</Text>
        <Chips>
          {options.map((o) => {
            const on = (highlight ?? options[0]?.id) === o.id
            return (
              <Pressable
                key={o.id}
                hitSlop={6}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setHighlight(o.id)}
              >
                <Chip on={on}>{o.label}</Chip>
              </Pressable>
            )
          })}
        </Chips>
      </View>
      {report.bodyweight ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: withBodyweight }}
          onPress={() => setWithBodyweight((v) => !v)}
          className="min-h-12 flex-row items-center gap-3 px-1"
        >
          <View
            className={cn(
              'size-6 items-center justify-center rounded-md',
              withBodyweight ? 'bg-foreground' : 'border-2 border-border',
            )}
          >
            {withBodyweight ? <Icon as={Check} strokeWidth={3} className="size-4 text-background" /> : null}
          </View>
          <Text className={BODY}>Bodyweight on the card</Text>
        </Pressable>
      ) : null}
      <Button className={BTN} onPress={() => void Share.share({ message: cardText(card) })}>
        <Icon as={Share2} className="size-4.5 text-primary-foreground" />
        <Text className={BTN_TEXT}>Share</Text>
      </Button>
    </SheetBody>
  )
}

/** One look of the card: a round swatch, ringed when picked. */
function Swatch({
  label,
  on,
  className,
  onPress,
}: {
  label: string
  on: boolean
  className: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={2}
      className={cn('size-11 rounded-full', className, on && 'border-2 border-foreground')}
    />
  )
}
