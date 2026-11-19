'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzePdfImport } from '@/lib/parser/pdfImport'
import { validateAnalysisFile } from './analysisFileSupport'
import { type ParserDocument } from './parserTypes'
import { isCurrentAnalysisRequest } from './analysisRequestGuard'

// The inline alert carries the reason; repeating it here made screen readers say it twice.
const ANALYSIS_FAILED_ANNOUNCEMENT = 'Analysis failed. See the message on the page.'

export function useParserDocument() {
  const [document, setDocument] = useState<ParserDocument | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const generationRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef('')

  const releaseObjectUrl = useCallback(() => {
    if (!objectUrlRef.current) return
    URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
  }, [])

  useEffect(() => () => {
    generationRef.current += 1
    controllerRef.current?.abort()
    releaseObjectUrl()
  }, [releaseObjectUrl])

  const handleFile = async (file: File) => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    controllerRef.current?.abort()
    releaseObjectUrl()
    setDocument(null)
    setIsAnalyzing(true)

    const controller = new AbortController()
    controllerRef.current = controller
    setAnnouncement(`Analysis started for ${file.name}.`)

    let objectUrl = ''
    try {
      const validationError = await validateAnalysisFile(file)
      if (!isCurrentAnalysisRequest(generation, generationRef.current, controller.signal)) return
      if (validationError) {
        setDocument({ fileName: file.name, objectUrl, error: validationError })
        setAnnouncement(ANALYSIS_FAILED_ANNOUNCEMENT)
        return
      }

      objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl
      const result = await analyzePdfImport(file, { signal: controller.signal })
      if (!isCurrentAnalysisRequest(generation, generationRef.current, controller.signal)) {
        if (objectUrlRef.current === objectUrl) releaseObjectUrl()
        return
      }
      if (result.success) {
        setDocument({ fileName: file.name, objectUrl, ...result.analysis })
        setAnnouncement(`Analysis completed for ${file.name}.`)
      } else {
        setDocument({ fileName: file.name, objectUrl, error: result.error })
        setAnnouncement(ANALYSIS_FAILED_ANNOUNCEMENT)
      }
    } catch (error) {
      if (!isCurrentAnalysisRequest(generation, generationRef.current, controller.signal)) return
      const message = error instanceof Error
        ? error.message
        : 'CVForge could not analyze this PDF.'
      setDocument({ fileName: file.name, objectUrl, error: message })
      setAnnouncement(ANALYSIS_FAILED_ANNOUNCEMENT)
    } finally {
      if (generation === generationRef.current) {
        controllerRef.current = null
        setIsAnalyzing(false)
      }
    }
  }

  const clearDocument = () => {
    generationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    releaseObjectUrl()
    setIsAnalyzing(false)
    setDocument(null)
    setAnnouncement('PDF analysis cleared.')
  }

  return { document, isAnalyzing, announcement, handleFile, clearDocument }
}
