import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayField } from '@/components/day-field'
import { Dialog } from '@/components/dialog'
import { RulerPicker } from '@/components/ruler-picker'
import { H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { dayKey } from '@/lib/logic/stats'
import type { Units } from '@/lib/types'

interface LogWeightDialogProps {
  open: boolean
  onClose: () => void
  units: Units
  /** Where the ruler starts: the last weigh-in, or a middle-of-the-road weight on the first. */
  initial: number | undefined
  /** The weight and the local day (YYYY-MM-DD) it is for: today unless stepped back. */
  onSave: (weight: number, day: string) => void
}

/** A weigh-in on the ruler of the setup, for today or a day stepped back (the web's date field). */
export function LogWeightDialog({ open, onClose, units, initial, onSave }: LogWeightDialogProps) {
  const kg = units === 'kg'
  const start = initial ?? (kg ? 70 : 155)
  const [weight, setWeight] = useState(start)
  const [day, setDay] = useState(() => dayKey(new Date()))
  // The dialog stays mounted between uses: each opening starts from the latest weigh-in again, for today.
  useEffect(() => {
    if (open) {
      setWeight(start)
      setDay(dayKey(new Date()))
    }
  }, [open, start])
  return (
    <Dialog open={open} onClose={onClose}>
      <Text className={H2}>Bodyweight</Text>
      <RulerPicker
        value={weight}
        unit={units}
        step={kg ? 0.5 : 1}
        perLabel={10}
        perMid={kg ? 2 : 5}
        min={kg ? 30 : 60}
        max={kg ? 250 : 550}
        onChange={setWeight}
        label="bodyweight"
      />
      <DayField value={day} onChange={setDay} max={dayKey(new Date())} />
      <View className="gap-2">
        <Button
          className={BTN}
          onPress={() => {
            onClose()
            onSave(weight, day)
          }}
        >
          <Text className={BTN_TEXT}>Save</Text>
        </Button>
        <Button variant="ghost" className="h-12" onPress={onClose}>
          <Text className="text-lg font-semibold text-foreground">Cancel</Text>
        </Button>
      </View>
    </Dialog>
  )
}
