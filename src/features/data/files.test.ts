import { afterEach, expect, it, jest } from '@jest/globals'
import * as DocumentPicker from 'expo-document-picker'
import { pickFile } from './files'

afterEach(() => {
  jest.restoreAllMocks()
})

it('treats document-picker cancellation as no selected file', async () => {
  jest.spyOn(DocumentPicker, 'getDocumentAsync').mockResolvedValue({ canceled: true, assets: null })
  await expect(pickFile()).resolves.toBeNull()
})

it('surfaces file-picker failures instead of silently treating them as cancellation', async () => {
  jest.spyOn(DocumentPicker, 'getDocumentAsync').mockRejectedValue(new Error('Permission denied'))
  await expect(pickFile()).rejects.toThrow('Permission denied')
})

it('preserves the selected document name when Android copies it to the app cache', async () => {
  jest.spyOn(DocumentPicker, 'getDocumentAsync').mockResolvedValue({
    canceled: false,
    assets: [
      {
        name: 'everything.json',
        uri: 'file:///cache/selected-backup.json',
        mimeType: 'application/json',
        lastModified: 0,
      },
    ],
  })
  const picked = await pickFile()
  expect(picked?.name).toBe('everything.json')
})
