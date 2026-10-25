import type { ImageSourcePropType } from 'react-native'

import type { ThemeScheme } from '@/theme/themes'

export type EmptyStateIllustration = 'lifts' | 'body' | 'measurements' | 'report'

/** Static Blender renders: only the selected empty-state images are bundled with the app. */
export const EMPTY_STATE_IMAGES: Record<ThemeScheme, Record<EmptyStateIllustration, ImageSourcePropType>> = {
  light: {
    lifts: require('@/assets/illustrations/empty-states/light-lifts.webp'),
    body: require('@/assets/illustrations/empty-states/light-body.webp'),
    measurements: require('@/assets/illustrations/empty-states/light-measurements.webp'),
    report: require('@/assets/illustrations/empty-states/light-report.webp'),
  },
  dark: {
    lifts: require('@/assets/illustrations/empty-states/dark-lifts.webp'),
    body: require('@/assets/illustrations/empty-states/dark-body.webp'),
    measurements: require('@/assets/illustrations/empty-states/dark-measurements.webp'),
    report: require('@/assets/illustrations/empty-states/dark-report.webp'),
  },
}
