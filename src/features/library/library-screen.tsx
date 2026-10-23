import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight, Search } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { Chip, Chips } from '@/components/chip'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Screen } from '@/components/screen'
import { CAPTION, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { EQUIPMENT, EQUIPMENT_LABEL, type Equipment, searchLibrary } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { MUSCLE_LABEL, MUSCLES } from '@/lib/logic/stats'
import type { Muscle } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Every lift the app knows (canvas: Library): a search box, one row of muscle chips and one of
 * equipment chips, the count, and the rows; a row opens the lift's page, which steps through the rows
 * in view. The `/library` page, from the menu.
 */
export function LibraryScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const placeholder = useResolveClassNames('text-muted-foreground')
  const results = useMemo(
    () => searchLibrary({ query, muscle: muscle ?? undefined, equipment: equipment ?? undefined }, LIBRARY),
    [query, muscle, equipment],
  )
  // A row opens the exercise drawer, the same one the workout and the plan open.
  const open = (id: string) => router.push({ pathname: '/exercise/[id]', params: { id } })
  const count = `${results.length} ${results.length === 1 ? 'exercise' : 'exercises'}`

  return (
    <Screen
      bar={{
        title: 'Library',
        left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
      }}
    >
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Library
        </Text>
      </View>
      <View className="mt-4 min-h-14 flex-row items-center gap-3 rounded-xl bg-card px-4">
        <Icon as={Search} className="size-4.5 text-muted-foreground" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the library"
          placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
          accessibilityLabel="Search the library"
          returnKeyType="search"
          clearButtonMode="while-editing"
          className="flex-1 py-3 text-lg font-medium text-foreground"
        />
      </View>
      <Chips className="mt-3">
        <FilterChip label="All muscles" on={muscle === null} onPress={() => setMuscle(null)} />
        {MUSCLES.map((m) => (
          <FilterChip key={m} label={MUSCLE_LABEL[m]} on={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </Chips>
      <Chips className="mt-2">
        <FilterChip label="All equipment" on={equipment === null} onPress={() => setEquipment(null)} />
        {EQUIPMENT.map((e) => (
          <FilterChip key={e} label={EQUIPMENT_LABEL[e]} on={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </Chips>
      <Text className={cn(CAPTION, NUMBER, 'mt-4')}>{count}</Text>
      {results.length > 0 ? (
        <Group className="mt-2">
          {results.map((e) => {
            const sub = `${MUSCLE_LABEL[e.muscle]}, ${EQUIPMENT_LABEL[e.equipment].toLowerCase()}`
            return (
              <Row key={e.id} tall accessibilityLabel={`${e.name}, ${sub}`} onPress={() => open(e.id)}>
                <ExerciseThumb name={e.name} />
                <RowBody>
                  <RowTitle>{e.name}</RowTitle>
                  <RowSub>{sub}</RowSub>
                </RowBody>
                <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
              </Row>
            )
          })}
        </Group>
      ) : (
        <Text className={cn(SECONDARY, 'mt-4')}>No exercise matches.</Text>
      )}
    </Screen>
  )
}

/** A chip that filters: pressed, it fills in. */
function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={6} onPress={onPress}>
      <Chip on={on}>{label}</Chip>
    </Pressable>
  )
}
