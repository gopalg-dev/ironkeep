import { useLocalSearchParams, useRouter } from 'expo-router'
import { Trash2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { BODY, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import type { Settings, Workout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SessionEditor } from './session-editor'
import { sessionLine } from './stats-model'

const DELETE = 'Delete session'

/**
 * A finished session to fix (canvas: Stats, session editor): the workout screen's cards over the
 * stored sets, Save changes, and Delete behind a check. Opened from a day on the Stats calendar.
 * The `/session-editor` sheet.
 */
export function SessionEditorScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<{ workout: Workout; settings: Settings } | null>(null)
  const [askDelete, setAskDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([repo.getWorkout(id ?? ''), repo.getSettings()]).then(([workout, settings]) => {
      if (live && workout) setData({ workout, settings })
    })
    return () => {
      live = false
    }
  }, [id])

  async function remove() {
    if (!data || busy) return
    setBusy(true)
    try {
      await repo.deleteWorkout(data.workout.id)
      setAskDelete(false)
      router.back()
    } finally {
      setBusy(false)
    }
  }

  const workout = data?.workout ?? null
  // The offer of a ramp belongs to a session in progress; here the sets are what they were.
  const stored = workout ? { ...workout, entries: workout.entries.map(({ rampOffer: _offer, ...e }) => e) } : null
  return (
    <>
      <SessionEditor
        workout={stored}
        settings={data?.settings ?? null}
        line={workout ? sessionLine(workout) : ''}
        action={() => 'Save changes'}
        onSave={(changes) => (workout ? repo.updateWorkoutSets(workout.id, changes).then(() => {}) : Promise.resolve())}
        foot={
          data ? (
            <Button variant="ghost" className="h-12" disabled={busy} onPress={() => setAskDelete(true)}>
              <Icon as={Trash2} className="size-4.5 text-destructive" />
              <Text className="text-lg font-semibold text-destructive">{DELETE}</Text>
            </Button>
          ) : undefined
        }
      />
      <Dialog open={askDelete} onClose={() => setAskDelete(false)}>
        <View className="gap-1">
          <Text className={H2}>{`Delete this ${workout?.dayName ?? 'session'}?`}</Text>
          <Text className={cn(BODY, 'text-muted-foreground')}>Its sets leave your stats. The plan is not touched.</Text>
        </View>
        <View className="gap-2">
          <Button variant="destructive" className={BTN} disabled={busy} onPress={remove}>
            <Icon as={Trash2} className="size-4.5 text-white" />
            <Text className={cn(BTN_TEXT, 'text-white')}>{DELETE}</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => setAskDelete(false)}>
            <Text className="text-lg font-semibold text-foreground">Keep it</Text>
          </Button>
        </View>
      </Dialog>
    </>
  )
}
