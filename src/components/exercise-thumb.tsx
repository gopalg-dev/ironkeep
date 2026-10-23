import { Image, Pressable, View } from 'react-native'

import { findLibraryByName } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { LIBRARY_IMAGES } from '@/lib/library-images'
import { cn } from '@/lib/utils'

interface ExerciseThumbProps {
  name: string
  /** Given, the picture is a button: a tap opens the lift's page. */
  onPress?: () => void
  className?: string
}

/**
 * The bundled start picture of a lift the library knows, by name; a quiet square for one it does
 * not. With `onPress` it is a button with a touch area grown to 48.
 */
export function ExerciseThumb({ name, onPress, className }: ExerciseThumbProps) {
  const known = findLibraryByName(LIBRARY, name)
  const source = known ? LIBRARY_IMAGES[`${known.id}-0`] : undefined
  const classes = cn('size-10 rounded-md bg-secondary', className)
  const picture = source ? (
    <Image source={source} className={classes} accessibilityIgnoresInvertColors />
  ) : (
    <View className={classes} />
  )
  if (!onPress) return picture
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, how to do it`} hitSlop={4} onPress={onPress}>
      {picture}
    </Pressable>
  )
}
