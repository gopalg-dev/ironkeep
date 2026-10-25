import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import type { Period } from '@/lib/logic/report'

/** Capture only the card. Keep the temporary file alive for the receiving app to read. */
export async function shareReportImage(view: Parameters<typeof captureRef>[0], period: Period): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Image sharing is unavailable on this device.')
  }
  // Use the native temporary name so view-shot can clean up its own cache files.
  const uri = await captureRef(view, {
    format: 'png',
    result: 'tmpfile',
    width: 1080,
    height: 1350,
  })
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: `Share your ${period.kind}`,
  })
}
