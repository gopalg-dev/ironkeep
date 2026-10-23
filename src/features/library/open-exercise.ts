import { useRouter } from 'expo-router'

import { findLibraryByName } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'

/**
 * A tap on a lift's picture opens its page in the library, when the library knows the name. Returns
 * the handler for a name, or nothing for a lift of the user's own, so the picture stays plain.
 */
export function useOpenExercise(): (name: string) => (() => void) | undefined {
  const router = useRouter()
  return (name) => {
    const known = findLibraryByName(LIBRARY, name)
    if (!known) return undefined
    return () => router.push({ pathname: '/exercise/[id]', params: { id: known.id } })
  }
}
