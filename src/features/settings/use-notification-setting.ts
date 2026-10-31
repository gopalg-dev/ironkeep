import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { setWorkoutNotifications, workoutNotificationsEnabled } from '@/features/workout/notification-settings'

export function useNotificationSetting() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const changing = useRef(false)
  const revision = useRef(0)
  useFocusEffect(
    useCallback(() => {
      let live = true
      const reload = () => {
        const current = ++revision.current
        void workoutNotificationsEnabled()
          .then((value) => {
            if (live && current === revision.current && !changing.current) setEnabled(value)
          })
          .catch(() => {
            if (live && current === revision.current && !changing.current) setEnabled(false)
          })
      }
      reload()
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') reload()
      })
      return () => {
        live = false
        listener.remove()
      }
    }, []),
  )

  async function change(value: boolean) {
    if (changing.current) return null
    revision.current += 1
    changing.current = true
    setBusy(true)
    try {
      const result = await setWorkoutNotifications(value)
      setEnabled(await workoutNotificationsEnabled())
      return result
    } finally {
      changing.current = false
      setBusy(false)
    }
  }

  return { enabled, busy, change }
}
