import { useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'
import { EQUIPMENT, EQUIPMENT_LABEL, type Equipment, type LibraryRow, searchLibrary } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { MUSCLE_LABEL, MUSCLES } from '@/lib/logic/stats'
import type { Muscle } from '@/lib/types'
import { Chip, Chips } from './chip'
import { Dialog } from './dialog'
import { Row, RowBody, RowSub, RowTitle } from './row'
import { H2 } from './typography'
import { Button } from './ui/button'
import { Text } from './ui/text'

export function LibraryPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (row: LibraryRow) => void
}) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | undefined>()
  const [equipment, setEquipment] = useState<Equipment | undefined>()
  const results = searchLibrary({ query, muscle, equipment }, LIBRARY)
  return (
    <Dialog open={open} onClose={onClose}>
      <Text className={H2} accessibilityRole="header">
        Pick from library
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search exercises"
        className="min-h-12 rounded-xl bg-background px-3 text-base font-normal text-foreground"
      />
      <View className="max-h-30">
        <FlatList
          horizontal
          data={[undefined, ...MUSCLES]}
          keyExtractor={(m) => m ?? 'all'}
          renderItem={({ item }) => (
            <Button variant="ghost" onPress={() => setMuscle(item)} accessibilityState={{ selected: muscle === item }}>
              <Chip on={muscle === item}>{item ? MUSCLE_LABEL[item] : 'All muscles'}</Chip>
            </Button>
          )}
        />
      </View>
      <Chips>
        {[undefined, ...EQUIPMENT].map((item) => (
          <Button
            key={item ?? 'all'}
            variant="ghost"
            className="h-auto p-0"
            onPress={() => setEquipment(item)}
            accessibilityState={{ selected: equipment === item }}
          >
            <Chip on={equipment === item}>{item ? EQUIPMENT_LABEL[item] : 'All equipment'}</Chip>
          </Button>
        ))}
      </Chips>
      <View className="h-64">
        <FlatList
          data={results}
          keyExtractor={(row) => row.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text>No exercise matches.</Text>}
          renderItem={({ item }) => (
            <Row
              onPress={() => {
                onPick(item)
                onClose()
              }}
              accessibilityLabel={`Use ${item.name}`}
            >
              <RowBody>
                <RowTitle>{item.name}</RowTitle>
                <RowSub>{[MUSCLE_LABEL[item.muscle], EQUIPMENT_LABEL[item.equipment]].join(', ')}</RowSub>
              </RowBody>
            </Row>
          )}
        />
      </View>
      <Button variant="ghost" onPress={onClose}>
        <Text>Cancel</Text>
      </Button>
    </Dialog>
  )
}
