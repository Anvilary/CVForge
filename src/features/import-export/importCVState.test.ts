import { expect, it, vi } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import { importCVState, MAX_JSON_IMPORT_BYTES } from './importCVState'

it('accepts a valid backup at the exact byte limit and preserves extension data', async () => {
  const input = { ...defaultCVState, extension: 'á'.repeat(2048) }
  const json = JSON.stringify(input)
  const padding = ' '.repeat(MAX_JSON_IMPORT_BYTES - Buffer.byteLength(json))
  const file = new File([json, padding], 'backup.json')
  expect(file.size).toBe(MAX_JSON_IMPORT_BYTES)
  await expect(importCVState(file)).resolves.toEqual(input)
})

it.each([
  [0, 'empty'],
  [MAX_JSON_IMPORT_BYTES + 1, 'exceeds the 5 MiB file size limit'],
])('rejects a file of %i bytes before reading it', async (size, message) => {
  const text = vi.fn()
  await expect(importCVState({ size, text })).rejects.toThrow(message)
  expect(text).not.toHaveBeenCalled()
})

it.each([
  ['{broken', 'does not contain valid JSON'],
  [JSON.stringify({ ...defaultCVState, resume: null }), 'not a valid CVForge backup'],
  [JSON.stringify({ ...defaultCVState, schemaVersion: '2.0.0' }), 'newer version of CVForge'],
])('reports the reason a backup is rejected (%#)', async (contents, message) => {
  await expect(importCVState(new File([contents], 'backup.json'))).rejects.toThrow(message)
})

it('reports a read failure without exposing the underlying error', async () => {
  const text = vi.fn().mockRejectedValue(new Error('internal file error'))
  await expect(importCVState({ size: 1, text })).rejects.toThrow('CVForge could not read this backup.')
})
