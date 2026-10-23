import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { CheckOption } from '@/components/check-option'
import { Chip, Chips } from '@/components/chip'
import { SheetBody } from '@/components/sheet'
import { CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { STEP_OPTIONS, type StepKind, stepsOf } from '@/lib/logic/progression'
import { fmtWeight } from '@/lib/logic/units'
import type { Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<StepKind, string> = { plates: 'Bar plates', dumbbell: 'Dumbbells', stack: 'Machine stack' }
const KINDS: StepKind[] = ['plates', 'dumbbell', 'stack']

/**
 * The smallest steps (canvas: Settings): the smallest bar plate, the gap between dumbbells and the
 * stack's step, each from its unit's options; Same for all puts the plate on every kind. The
 * `/steps` sheet.
 */
export function StepsScreen() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [plate, setPlate] = useState(0)
  const [dumbbell, setDumbbell] = useState(0)
  const [stack, setStack] = useState(0)
  const [same, setSame] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    repo.getSettings().then((s) => {
      if (!live) return
      const steps = stepsOf(s)
      setSettings(s)
      setPlate(steps.plates)
      setDumbbell(steps.dumbbell)
      setStack(steps.stack)
      setSame(Boolean(s.sameStep))
    })
    return () => {
      live = false
    }
  }, [])
  if (!settings) return <SheetBody>{null}</SheetBody>
  const units = settings.units
  const value: Record<StepKind, number> = { plates: plate, dumbbell, stack }
  const set: Record<StepKind, (v: number) => void> = { plates: setPlate, dumbbell: setDumbbell, stack: setStack }

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      await repo.saveSettings({ plate, dumbbellStep: dumbbell, stackStep: stack, sameStep: same })
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetBody>
      <Text className={H2}>Smallest steps</Text>
      {KINDS.filter((k) => k === 'plates' || !same).map((k) => (
        <View key={k} className="gap-2">
          <Text className={cn(CAPTION, 'px-1')}>{KIND_LABEL[k]}</Text>
          <Chips>
            {STEP_OPTIONS[k][units].map((v) => {
              const on = value[k] === v
              return (
                <Pressable
                  key={v}
                  hitSlop={6}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => set[k](v)}
                >
                  <Chip on={on}>{fmtWeight(v, units)}</Chip>
                </Pressable>
              )
            })}
          </Chips>
        </View>
      ))}
      <CheckOption checked={same} onChange={setSame} label="Same for all" />
      <View className="gap-2">
        <Button className={BTN} disabled={busy} onPress={save}>
          <Icon as={Check} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Save</Text>
        </Button>
        <Button variant="ghost" className="h-12" onPress={() => router.back()}>
          <Text className="text-lg font-semibold text-foreground">Cancel</Text>
        </Button>
      </View>
    </SheetBody>
  )
}
