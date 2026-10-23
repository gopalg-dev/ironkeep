import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { BTN_SM, BTN_SM_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { SheetScroll } from '@/components/sheet'
import { CAPTION, H2, NUMBER } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { findLibrary } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { cn } from '@/lib/utils'
import { ExerciseFacts, ExercisePictures } from './exercise-body'

/**
 * One lift of the library (canvas: the exercise drawer): its two pictures, the name, what it is
 * (muscle, equipment, level), what it works, the cues as numbered steps, and Previous / Next through
 * the library. The `/exercise/[id]` sheet, raised over whatever opened it (a lift's picture on Today,
 * the workout, zen or Plan) so the page behind stays in place; Previous and Next turn the page inside
 * the sheet from a footer that stays under the cues, and the sheet's own drag or the back key closes it.
 */
export function ExerciseDetailScreen() {
  const router = useRouter()
  const { id: opened } = useLocalSearchParams<{ id: string }>()
  const [id, setId] = useState(opened ?? '')
  const at = LIBRARY.findIndex((e) => e.id === id)
  const exercise = findLibrary(LIBRARY, id)
  if (!exercise) return <SheetScroll>{null}</SheetScroll>
  const prev = LIBRARY[at - 1]
  const next = LIBRARY[at + 1]
  const step = (to: string) => {
    setId(to)
    router.setParams({ id: to })
  }

  return (
    // Keyed by the lift, so a step to the next one starts at the top.
    <SheetScroll
      key={exercise.id}
      footer={
        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            className={cn(BTN_SM, 'flex-1')}
            disabled={!prev}
            accessibilityLabel={prev ? `Previous, ${prev.name}` : 'Previous'}
            onPress={() => prev && step(prev.id)}
          >
            <Icon as={ChevronLeft} className="size-4.5 text-foreground" />
            <Text className={cn(BTN_SM_TEXT, 'text-foreground')}>Previous</Text>
          </Button>
          <Button
            variant="secondary"
            className={cn(BTN_SM, 'flex-1')}
            disabled={!next}
            accessibilityLabel={next ? `Next, ${next.name}` : 'Next'}
            onPress={() => next && step(next.id)}
          >
            <Text className={cn(BTN_SM_TEXT, 'text-foreground')}>Next</Text>
            <Icon as={ChevronRight} className="size-4.5 text-foreground" />
          </Button>
        </View>
      }
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" className={H2}>
            {exercise.name}
          </Text>
          <Text className={cn(CAPTION, NUMBER)}>{`${at + 1} of ${LIBRARY.length}`}</Text>
        </View>
        <IconButton as={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <ExercisePictures exercise={exercise} />
      <ExerciseFacts exercise={exercise} />
    </SheetScroll>
  )
}
