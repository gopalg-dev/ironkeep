import { useState } from 'react'
import { TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayField } from '@/components/day-field'
import { Dialog } from '@/components/dialog'
import { H2, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { Measures } from '@/db/repo'
import { dayKey } from '@/lib/logic/stats'
import { cn } from '@/lib/utils'
import { TAPE_LABEL, TAPES, type Tape } from './stats-model'

interface LogTapeDialogProps {
  open: boolean
  onClose: () => void
  unit: 'cm' | 'in'
  /** The last values, shown quiet in the empty fields. */
  initial: Partial<Record<Tape, number>>
  /** The numbers and the local day (YYYY-MM-DD) they are for: today unless stepped back. */
  onSave: (m: Measures, day: string) => void
}

const parse = (s: string): number | undefined => {
  const n = Number(s.replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

/** The tape's three numbers (canvas: Stats body, Log): arm, chest and waist, any of them, for today or a day stepped back. */
export function LogTapeDialog({ open, onClose, unit, initial, onSave }: LogTapeDialogProps) {
  const [values, setValues] = useState<Record<Tape, string>>({ arm: '', chest: '', waist: '' })
  const [day, setDay] = useState(() => dayKey(new Date()))
  const placeholder = useResolveClassNames('text-muted-foreground')
  const measures: Measures = { arm: parse(values.arm), chest: parse(values.chest), waist: parse(values.waist) }
  const any = TAPES.some((t) => measures[t] !== undefined)
  return (
    <Dialog open={open} onClose={onClose}>
      <Text accessibilityRole="header" className={H2}>
        Measurements
      </Text>
      <View className="gap-2">
        {TAPES.map((t) => (
          <View key={t} className="min-h-14 flex-row items-center justify-between gap-3 rounded-xl bg-background px-4">
            <Text className={SECONDARY}>{TAPE_LABEL[t]}</Text>
            <View className="flex-row items-baseline gap-1">
              <TextInput
                value={values[t]}
                onChangeText={(s) => setValues((v) => ({ ...v, [t]: s }))}
                placeholder={initial[t] !== undefined ? String(initial[t]) : ''}
                placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
                keyboardType="decimal-pad"
                accessibilityLabel={`${TAPE_LABEL[t]}, ${unit}`}
                maxLength={6}
                className={cn('min-w-16 py-3 text-right text-lg font-semibold text-foreground', NUMBER)}
              />
              <Text className={SECONDARY}>{unit}</Text>
            </View>
          </View>
        ))}
        <DayField value={day} onChange={setDay} max={dayKey(new Date())} />
      </View>
      <View className="gap-2">
        <Button
          className={BTN}
          disabled={!any}
          onPress={() => {
            onClose()
            onSave(measures, day)
            setValues({ arm: '', chest: '', waist: '' })
            setDay(dayKey(new Date()))
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
