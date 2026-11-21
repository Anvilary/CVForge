import type { CVState } from '@/features/cv/model/types'

export interface GenerateRequest {
  type: 'generate'
  id: number
  state: CVState
}

export type GenerationResponse =
  | { type: 'ready' }
  | { type: 'generated', id: number, bytes: ArrayBuffer, pageKeys: string[], generateMs: number, fingerprintMs: number }
  | { type: 'failed', id: number, message: string }
