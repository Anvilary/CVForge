import { type CVState } from '@/features/cv/model/types'
import { parseCVState } from '@/features/cv/model/parse'
import { isNewerSchemaVersion, migrateCVState } from '@/features/cv/persistence/cvMigrations'

export const MAX_JSON_IMPORT_MIB = 5
export const MAX_JSON_IMPORT_BYTES = MAX_JSON_IMPORT_MIB * 1024 * 1024

export async function importCVState(file: Pick<File, 'size' | 'text'>): Promise<CVState> {
  if (file.size === 0) throw new Error('The selected JSON backup is empty.')
  if (file.size > MAX_JSON_IMPORT_BYTES) {
    throw new Error(`This JSON backup exceeds the ${MAX_JSON_IMPORT_MIB} MiB file size limit.`)
  }

  const text = await file.text().catch(() => {
    throw new Error('CVForge could not read this backup. Choose the file again and retry.')
  })
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    throw new Error('The selected backup does not contain valid JSON.')
  }
  if (isNewerSchemaVersion(input)) {
    throw new Error('This backup was created by a newer version of CVForge. Open it using a newer version.')
  }

  const parsed = parseCVState(migrateCVState(input))
  if (!parsed) {
    throw new Error('The selected file is not a valid CVForge backup.')
  }

  return parsed
}
