import { AccessibilityInfo } from 'react-native'

/**
 * Speak a change that is not a navigation, so a screen-reader user hears it: a set ticked, a weigh-in
 * saved, a snapshot written, a backup restored. A screen change announces itself, so those are not
 * announced here (step 7 of docs/research/accessibility.md). Silent when no screen reader is on.
 */
export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message)
}
