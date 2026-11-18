'use client'

import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { useCV } from '@/features/cv/state/CVContext'
import { analyzePdfImport } from '@/lib/parser/pdfImport'
import { type HeuristicResult } from '@/lib/parser/heuristicResumeParser'
import { type CVState } from '@/features/cv/model/types'
import { importCVState } from './importCVState'
import { announce } from '@/shared/utils/announce'
import { markCVImported } from '@/features/cv/events/importEvents'
import { type ImportModalProps } from './importModalTypes'

type ImportModalFlowOptions = Pick<ImportModalProps, 'onClose' | 'onComplete'>

type PendingImport =
  | { type: 'json' | 'pdf-embedded'; state: CVState }
  | { type: 'pdf-heuristic'; state: CVState; heuristic: HeuristicResult }

type ImportStep =
  | { status: 'idle'; error?: string }
  | { status: 'analyzing' }
  | { status: 'review'; generation: number; pending: PendingImport }

async function prepareImport(file: File, signal: AbortSignal): Promise<PendingImport> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) {
    return { type: 'json', state: await importCVState(file, signal) }
  }
  if (!name.endsWith('.pdf')) {
    throw new Error('Only .json backup files and .pdf resumes are supported.')
  }

  const result = await analyzePdfImport(file, { signal })
  if (!result.success) throw new Error(result.error)

  const { embeddedState, heuristic, sessionError } = result.analysis
  if (sessionError) throw new Error(sessionError)
  if (embeddedState) return { type: 'pdf-embedded', state: embeddedState }
  if (heuristic) return { type: 'pdf-heuristic', state: heuristic.draft, heuristic }
  throw new Error('Could not extract meaningful CV data from this PDF.')
}

export function useImportModalFlow({ onClose, onComplete }: ImportModalFlowOptions) {
  const { replaceState } = useCV()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const generationRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  const [step, setStep] = useState<ImportStep>({ status: 'idle' })

  const invalidateRequest = useCallback(() => {
    generationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  useLayoutEffect(() => invalidateRequest, [invalidateRequest])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    input.value = ''

    invalidateRequest()
    const generation = generationRef.current
    const controller = new AbortController()
    controllerRef.current = controller
    setStep({ status: 'analyzing' })

    try {
      const pending = await prepareImport(file, controller.signal)
      if (generation === generationRef.current) {
        setStep({ status: 'review', generation, pending })
      }
    } catch (error) {
      if (generation === generationRef.current) {
        const message = error instanceof Error ? error.message : 'Import failed. Check the file and try again.'
        setStep({ status: 'idle', error: message })
      }
    } finally {
      if (generation === generationRef.current) controllerRef.current = null
    }
  }

  const handleCancelPending = () => {
    invalidateRequest()
    setStep({ status: 'idle' })
  }

  const handleClose = () => {
    handleCancelPending()
    onClose()
  }

  const handleConfirm = () => {
    if (step.status !== 'review' || step.generation !== generationRef.current) return

    const { state } = step.pending
    handleCancelPending()
    replaceState(state)
    markCVImported(state)
    announce('Import completed. The reviewed CV data is now active in Builder.')
    onClose()
    onComplete?.()
  }

  return {
    step,
    fileInputRef,
    handleCancelPending,
    handleClose,
    handleConfirm,
    handleFileChange,
    openFileDialog: () => fileInputRef.current?.click(),
  }
}
