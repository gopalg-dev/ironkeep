import { Image, View } from 'react-native'

import { Chip, Chips } from '@/components/chip'
import { BODY, CAPTION, NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { EQUIPMENT_LABEL, FRAME_LABEL, FRAMES, type LibraryExercise } from '@/lib/library'
import { LIBRARY_IMAGES } from '@/lib/library-images'
import { MUSCLE_LABEL } from '@/lib/logic/stats'
import { cn } from '@/lib/utils'

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** The two pictures of a lift, side by side (canvas: the exercise drawer and the Library page). */
export function ExercisePictures({ exercise }: { exercise: LibraryExercise }) {
  return (
    <View className="flex-row gap-2">
      {FRAMES.map((frame, i) => {
        const source = LIBRARY_IMAGES[`${exercise.id}-${i}`]
        return source ? (
          <Image
            key={frame}
            source={source}
            accessibilityLabel={`${exercise.name}, ${FRAME_LABEL[frame].toLowerCase()}`}
            className="h-37.5 flex-1 rounded-xl bg-secondary"
            resizeMode="cover"
          />
        ) : (
          <View key={frame} className="h-37.5 flex-1 rounded-xl bg-secondary" />
        )
      })}
    </View>
  )
}

/**
 * What a lift is and how to do it: the muscle, equipment and level chips, what it works, the cues as
 * numbered steps, and the source. Shared by the exercise drawer and the Library's page.
 */
export function ExerciseFacts({ exercise }: { exercise: LibraryExercise }) {
  const works = `Works ${exercise.muscles.join(', ')}`
  return (
    <>
      <View className="gap-3">
        <Chips>
          <Chip>{MUSCLE_LABEL[exercise.muscle]}</Chip>
          <Chip>{EQUIPMENT_LABEL[exercise.equipment]}</Chip>
          <Chip>{capital(exercise.level)}</Chip>
        </Chips>
        <Text className={SECONDARY}>{works}</Text>
      </View>
      <View className="gap-3 rounded-xl bg-card p-4">
        {exercise.cues.map((cue, i) => (
          <View key={cue} className="flex-row items-start gap-3">
            <View className="mt-0.5 size-6 items-center justify-center rounded-full bg-secondary">
              <Text className={cn('text-sm font-bold text-foreground', NUMBER)}>{i + 1}</Text>
            </View>
            <Text className={cn(BODY, 'flex-1')}>{cue}</Text>
          </View>
        ))}
      </View>
      <Text className={CAPTION}>Pictures and cues from free-exercise-db, Unlicense.</Text>
    </>
  )
}
