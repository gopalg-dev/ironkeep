import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { z } from 'zod'

import * as repo from '@/db/repo'

const actionParams = z.object({ id: z.string().min(1), action: z.enum(['open', 'finish']) })

/** A stale notification must never finish or open the editor for a different workout. */
export function SessionNotificationRoute() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const parsed = actionParams.safeParse(params)
  const id = parsed.success ? parsed.data.id : undefined
  const action = parsed.success ? parsed.data.action : undefined
  useEffect(() => {
    let live = true
    void repo.getActiveWorkout().then((workout) => {
      if (!live) return
      if (!workout || workout.id !== id || !action) router.replace('/')
      else {
        const hasLoggedSets = workout.entries.some((entry) => entry.sets.some((set) => set.done))
        router.replace(action === 'finish' && hasLoggedSets ? '/finish' : '/zen')
      }
    })
    return () => {
      live = false
    }
  }, [id, action, router])
  return null
}
