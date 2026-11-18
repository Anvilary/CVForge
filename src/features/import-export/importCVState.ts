import { type CVState } from '@/features/cv/model/types'
import { parseCVState } from '@/features/cv/model/parse'
import { migrateCVState } from '@/features/cv/persistence/cvMigrations'

export async function importCVState(file: { text: () => Promise<string> }): Promise<CVState> {
  const parsed = parseCVState(migrateCVState(JSON.parse(await file.text())))

  if (!parsed) {
    throw new Error('The selected file is not a valid CVForge backup.')
  }

  return parsed
}
