import { LibraryBig, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { TextInput, View } from 'react-native'
import { DAY_LABEL } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { LibraryPicker } from '@/components/library-picker'
import { Segmented } from '@/components/segmented'
import { H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { ParsedPlan } from '@/lib/logic/plan-sheet'
import { MUSCLE_LABEL, MUSCLES } from '@/lib/logic/stats'
import { DAY_TYPES, type Exercise } from '@/lib/types'

/** The parsed file stays a draft until replacement is explicitly confirmed. */
export function PlanPreviewEditor({ parsed, onChange }: { parsed: ParsedPlan; onChange: (next: ParsedPlan) => void }) {
  const [library, setLibrary] = useState<{ day: string; exercise: string } | null>(null)
  const patch = (dayId: string, id: string, fields: Partial<Exercise>) =>
    onChange({
      ...parsed,
      days: parsed.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...fields } : e)),
            }
          : d,
      ),
    })
  return (
    <View className="gap-3">
      <LibraryPicker
        open={library !== null}
        onClose={() => setLibrary(null)}
        onPick={(row) => {
          if (library)
            patch(library.day, library.exercise, {
              name: row.name,
              muscle: row.muscle,
              loadType: row.loadType,
              sets: row.sets,
              repMin: row.repMin,
              repMax: row.repMax,
            })
        }}
      />
      {parsed.days.map((day) => (
        <View key={day.id} className="gap-3 rounded-xl bg-card p-4">
          <View className="flex-row items-center gap-2">
            <TextInput
              value={day.name}
              accessibilityLabel="Day name"
              maxLength={40}
              className="min-h-12 flex-1 text-xl font-semibold text-foreground"
              onChangeText={(name) =>
                onChange({ ...parsed, days: parsed.days.map((d) => (d.id === day.id ? { ...d, name } : d)) })
              }
            />
            <IconButton
              as={Trash2}
              accessibilityLabel={`Remove ${day.name}`}
              onPress={() => onChange({ ...parsed, days: parsed.days.filter((d) => d.id !== day.id) })}
            />
          </View>
          <View className="flex-row flex-wrap gap-1">
            {DAY_TYPES.map((type) => (
              <Button
                key={type}
                variant={type === day.type ? 'default' : 'ghost'}
                accessibilityState={{ selected: type === day.type }}
                onPress={() =>
                  onChange({ ...parsed, days: parsed.days.map((d) => (d.id === day.id ? { ...d, type } : d)) })
                }
              >
                <Text>{DAY_LABEL[type]}</Text>
              </Button>
            ))}
          </View>
          {day.exercises.map((exercise) => (
            <View key={exercise.id} className="gap-2 rounded-xl bg-background p-3">
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={exercise.name}
                  accessibilityLabel="Exercise name"
                  className="min-h-12 flex-1 text-lg font-medium text-foreground"
                  onChangeText={(name) => patch(day.id, exercise.id, { name })}
                />
                <IconButton
                  as={LibraryBig}
                  accessibilityLabel={`Pick a library lift for ${exercise.name}`}
                  onPress={() => setLibrary({ day: day.id, exercise: exercise.id })}
                />
                <IconButton
                  as={Trash2}
                  accessibilityLabel={`Remove ${exercise.name}`}
                  onPress={() =>
                    onChange({
                      ...parsed,
                      days: parsed.days.map((d) =>
                        d.id === day.id ? { ...d, exercises: d.exercises.filter((e) => e.id !== exercise.id) } : d,
                      ),
                    })
                  }
                />
              </View>
              <View className="flex-row gap-2">
                {(['sets', 'repMin', 'repMax'] as const).map((key) => (
                  <View key={key} className="flex-1">
                    <Text>{key === 'sets' ? 'Sets' : key === 'repMin' ? 'Low' : 'High'}</Text>
                    <TextInput
                      value={String(exercise[key])}
                      keyboardType="number-pad"
                      accessibilityLabel={`${exercise.name}, ${key}`}
                      className="min-h-12 rounded-lg bg-card px-3 text-lg font-normal text-foreground"
                      onChangeText={(text) => patch(day.id, exercise.id, { [key]: Number(text) || 0 })}
                    />
                  </View>
                ))}
              </View>
              <Segmented
                options={[
                  { value: 'weight', label: 'Weighted' },
                  { value: 'bodyweight', label: 'Bodyweight' },
                  { value: 'time', label: 'Seconds' },
                ]}
                value={exercise.loadType}
                onChange={(loadType) => patch(day.id, exercise.id, { loadType })}
                accessibilityLabel="Load type"
              />
              <View className="flex-row flex-wrap">
                {MUSCLES.map((muscle) => (
                  <Button
                    key={muscle}
                    variant={exercise.muscle === muscle ? 'default' : 'ghost'}
                    onPress={() => patch(day.id, exercise.id, { muscle })}
                  >
                    <Text>{MUSCLE_LABEL[muscle]}</Text>
                  </Button>
                ))}
              </View>
            </View>
          ))}
          {day.exercises.length === 0 ? <Text className={H2}>No exercises</Text> : null}
        </View>
      ))}
    </View>
  )
}
