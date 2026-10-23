import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, Search, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { BODY, CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { EQUIPMENT_LABEL, findLibraryByName, type LibraryRow, searchLibrary } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { MUSCLE_LABEL } from '@/lib/logic/stats'
import type { Plan, Workout } from '@/lib/types'
import { cn } from '@/lib/utils'

/** How many library lifts the sheet lists at once; the search narrows them. */
const SHOWN = 8

/**
 * Another lift takes this one's place today (canvas: Workout, swap lift): the plan line's alternates
 * first, then the library, with a search; "Also on the plan" changes the plan day too. The `/swap` sheet.
 */
export function SwapScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [query, setQuery] = useState('')
  const [alsoPlan, setAlsoPlan] = useState(false)
  const [busy, setBusy] = useState(false)
  const placeholder = useResolveClassNames('text-muted-foreground')
  useEffect(() => {
    let live = true
    Promise.all([repo.getActiveWorkout(), repo.getPlan()]).then(([w, p]) => {
      if (live) {
        setWorkout(w)
        setPlan(p)
      }
    })
    return () => {
      live = false
    }
  }, [])

  const entry = workout?.entries.find((e) => e.exerciseId === id)
  const line = plan?.days.find((d) => d.id === workout?.dayId)?.exercises.find((e) => e.id === id)
  const alternates = (line?.alternates ?? []).flatMap((name) => {
    const row = findLibraryByName(LIBRARY, name)
    return row ? [row] : []
  })
  const skip = new Set([entry?.name, ...alternates.map((a) => a.name)])
  const rows = searchLibrary({ query: query.trim() }, LIBRARY)
    .filter((r) => !skip.has(r.name))
    .slice(0, SHOWN)

  async function use(name: string) {
    if (!workout || !entry || busy) return
    setBusy(true)
    try {
      await repo.swapSessionExercise(workout.id, entry.exerciseId, name, alsoPlan && line !== undefined)
      router.back()
    } finally {
      setBusy(false)
    }
  }

  const lift = (row: LibraryRow, primary: boolean) => {
    const what = `${MUSCLE_LABEL[row.muscle]}, ${EQUIPMENT_LABEL[row.equipment].toLowerCase()}`
    return (
      <Row key={row.id} tone="page" tall>
        <ExerciseThumb name={row.name} />
        <RowBody>
          <RowTitle>{row.name}</RowTitle>
          <RowSub>{what}</RowSub>
        </RowBody>
        <Button
          variant={primary ? 'default' : 'secondary'}
          className={BTN_SM2}
          disabled={busy}
          accessibilityLabel={`Use ${row.name}`}
          onPress={() => use(row.name)}
        >
          <Icon as={Check} className={cn('size-4.5', primary ? 'text-primary-foreground' : 'text-foreground')} />
          <Text className={cn(BTN_SM2_TEXT, primary ? 'text-primary-foreground' : 'text-foreground')}>Use</Text>
        </Button>
      </Row>
    )
  }

  return (
    <SheetBody>
      <View className="flex-row items-center justify-between gap-3">
        <Text className={cn(H2, 'shrink')} numberOfLines={1}>
          {entry ? `Swap ${entry.name}` : 'Swap'}
        </Text>
        <IconButton as={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <View className="h-14 flex-row items-center gap-2.5 rounded-xl bg-background px-4">
        <Icon as={Search} className="size-4.5 text-muted-foreground" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the library"
          placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
          accessibilityLabel="Search the library"
          autoCorrect={false}
          className="flex-1 text-lg font-medium text-foreground"
        />
      </View>
      {alternates.length > 0 && !query.trim() ? (
        <View className="gap-2">
          <Text className={CAPTION}>Alternates on the plan</Text>
          <Group>{alternates.map((a) => lift(a, true))}</Group>
        </View>
      ) : null}
      <View className="gap-2">
        <Text className={CAPTION}>Library</Text>
        <Group>{rows.map((r) => lift(r, false))}</Group>
      </View>
      {line ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: alsoPlan }}
          onPress={() => setAlsoPlan((v) => !v)}
          className="min-h-12 flex-row items-center gap-3 px-1"
        >
          <View
            className={cn('size-6 items-center justify-center rounded-lg', alsoPlan ? 'bg-foreground' : 'bg-secondary')}
          >
            {alsoPlan ? <Icon as={Check} className="size-4.5 text-background" /> : null}
          </View>
          <Text className={BODY}>Also on the plan</Text>
        </Pressable>
      ) : null}
    </SheetBody>
  )
}
