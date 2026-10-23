import type { SplitTemplate } from '@/lib/content'
import type { LibraryExercise } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { BUNDLED_SPLITS } from '@/lib/splits'
import type { PlanDay, SplitId } from '@/lib/types'

/**
 * Reference content: the exercise library and the split templates. The web app keeps them in a
 * database so they can be edited there; the phone ships them in the bundle, read-only.
 */
export interface FullContent {
  library: LibraryExercise[]
  splits: SplitTemplate[]
}

export function readContent(): FullContent {
  return { library: LIBRARY, splits: BUNDLED_SPLITS }
}

/** A fresh copy of one template's days. */
export function splitTemplate(id: SplitId): PlanDay[] {
  const found = BUNDLED_SPLITS.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown split "${id}"`)
  return structuredClone(found.days)
}
