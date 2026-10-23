import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Whether the system "remove animations" setting is on, kept live. Gate any animation the app runs
 * itself on it, so a person who asked for less motion gets none (step 6 of docs/research/accessibility.md).
 * Scroll-linked movement that follows the finger is not gated; it is direct manipulation, not motion.
 */
export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (live) setOn(v)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn)
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return on
}
