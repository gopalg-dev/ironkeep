import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'

import { finishedPeriod } from '@/lib/logic/report'
import { shareReportImage } from './share-report-image'

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }))
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }))

const available = jest.mocked(Sharing.isAvailableAsync)
const capture = jest.mocked(captureRef)
const share = jest.mocked(Sharing.shareAsync)
const now = new Date(2026, 9, 25)
const week = finishedPeriod('week', new Date(2026, 9, 12), now)
const month = finishedPeriod('month', new Date(2026, 8, 1), now)

beforeEach(() => {
  jest.resetAllMocks()
  available.mockResolvedValue(true)
  capture.mockResolvedValue('file:///cache/report.png')
  share.mockResolvedValue(undefined)
})

describe('report image sharing', () => {
  it.each([
    [week, 'week'],
    [month, 'month'],
  ])('shares the selected card as a 4:5 PNG for %s', async (period, kind) => {
    await shareReportImage(42, period)
    expect(capture).toHaveBeenCalledWith(42, {
      format: 'png',
      result: 'tmpfile',
      width: 1080,
      height: 1350,
    })
    expect(share).toHaveBeenCalledWith('file:///cache/report.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: `Share your ${kind}`,
    })
  })

  it('does not capture when file sharing is unavailable', async () => {
    available.mockResolvedValue(false)
    await expect(shareReportImage(42, week)).rejects.toThrow('Image sharing is unavailable')
    expect(capture).not.toHaveBeenCalled()
    expect(share).not.toHaveBeenCalled()
  })

  it('does not open the share sheet when capture fails', async () => {
    capture.mockRejectedValue(new Error('Capture failed'))
    await expect(shareReportImage(42, week)).rejects.toThrow('Capture failed')
    expect(share).not.toHaveBeenCalled()
  })

  it('reports share failures and allows another attempt', async () => {
    share.mockRejectedValueOnce(new Error('Share failed'))
    await expect(shareReportImage(42, week)).rejects.toThrow('Share failed')
    await expect(shareReportImage(42, week)).resolves.toBeUndefined()
    expect(share).toHaveBeenCalledTimes(2)
  })
})
