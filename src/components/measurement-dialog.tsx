import { useEffect, useState } from 'react'
import { TextInput, View } from 'react-native'
import * as repo from '@/db/repo'
import { longDate } from '@/lib/format'
import type { MeasurementLog } from '@/lib/types'
import { Dialog } from './dialog'
import { ReplaceDialog } from './replace-dialog'
import { H2 } from './typography'
import { Button } from './ui/button'
import { Text } from './ui/text'

const SITES = ['arm', 'chest', 'waist'] as const
export function MeasurementDialog({
  log,
  unit,
  onClose,
  onChanged,
}: {
  log: MeasurementLog | null
  unit: string
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const [values, setValues] = useState({ arm: '', chest: '', waist: '' })
  const [remove, setRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (log) setValues({ arm: String(log.arm ?? ''), chest: String(log.chest ?? ''), waist: String(log.waist ?? '') })
    setError(null)
    setRemove(false)
  }, [log])
  const parsed = Object.fromEntries(
    SITES.map((site) => {
      const n = Number(values[site].replace(',', '.'))
      return [site, values[site].trim() && Number.isFinite(n) && n > 0 ? n : undefined]
    }),
  )
  const save = async () => {
    if (!log) return
    try {
      await repo.updateMeasurement(log.id, parsed)
      await onChanged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the measurement.')
    }
  }
  return (
    <>
      <Dialog open={log !== null && !remove} onClose={onClose}>
        <Text className={H2} accessibilityRole="header">
          {log ? longDate(log.date) : 'Measurements'}
        </Text>
        {SITES.map((site) => (
          <View key={site} className="flex-row items-center justify-between gap-3">
            <Text>{`${site} (${unit})`}</Text>
            <TextInput
              value={values[site]}
              onChangeText={(text) => setValues((v) => ({ ...v, [site]: text }))}
              accessibilityLabel={`${site}, ${unit}`}
              keyboardType="decimal-pad"
              className="min-h-12 min-w-24 rounded-xl bg-background px-3 text-lg font-normal text-foreground"
            />
          </View>
        ))}
        {error ? <Text className="text-destructive">{error}</Text> : null}
        <Button disabled={!SITES.some((s) => parsed[s] !== undefined)} onPress={() => void save()}>
          <Text>Save changes</Text>
        </Button>
        <Button variant="secondary" onPress={() => setRemove(true)}>
          <Text>Remove measurement</Text>
        </Button>
        <Button variant="ghost" onPress={onClose}>
          <Text>Cancel</Text>
        </Button>
      </Dialog>
      <ReplaceDialog
        open={remove}
        title="Remove this measurement?"
        phraseRequired="delete measurement"
        actionLabel="Remove"
        consequence="This tape entry leaves your history and charts."
        onClose={() => setRemove(false)}
        onConfirm={async () => {
          if (log) {
            await repo.deleteMeasurement(log.id)
            await onChanged()
            onClose()
          }
        }}
      />
    </>
  )
}
