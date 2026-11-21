'use client'

import { useRef, type ChangeEvent } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import {
  ANALYSIS_FILE_ACCEPT,
  MAX_ANALYSIS_FILE_MEGABYTES,
  MAX_ANALYSIS_PAGES,
} from './analysisFileSupport'

interface PdfUploadPanelProps {
  isAnalyzing: boolean
  onFile: (file: File) => void
  hasDocument?: boolean
  compact?: boolean
  className?: string
}

export function PdfUploadPanel({
  isAnalyzing,
  onFile,
  hasDocument = false,
  compact = false,
  className = '',
}: PdfUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }

  const triggerUpload = () => {
    inputRef.current?.click()
  }

  if (compact) {
    const label = isAnalyzing ? 'Choose another PDF' : hasDocument ? 'Replace PDF' : 'Upload PDF'
    return (
      <div className={`flex items-stretch sm:self-stretch w-full sm:w-[176px] ${className}`}>
        <button
          type="button"
          onClick={triggerUpload}
          aria-label={label}
          title={label}
          className="btn primary !h-auto min-h-[44px] sm:min-h-0 w-full sm:w-[176px] sm:self-stretch flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          <Icon name={isAnalyzing ? 'activity' : 'upload'} size={15} className={`shrink-0 ${isAnalyzing ? 'animate-pulse' : ''}`} />
          <span>{label}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ANALYSIS_FILE_ACCEPT}
          className="hidden"
          aria-label="Choose a PDF for local CV analysis"
          onChange={handleChange}
        />
      </div>
    )
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <button
        type="button"
        onClick={triggerUpload}
        aria-labelledby="analyzer-upload-title"
        aria-describedby="analyzer-upload-description"
        className="inline-grid w-fit max-w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 px-4 py-3 bg-bg-inset border border-border rounded-lg text-left hover:border-ember hover:bg-bg-2 transition-[background-color,border-color] group"
      >
        <div className="row-span-2 w-9 h-9 rounded-lg bg-bg-2 border border-border-strong flex items-center justify-center group-hover:border-ember/50 transition-colors">
          <Icon name="upload" size={16} className="text-ink-3 group-hover:text-ember transition-colors" />
        </div>
        <h3 id="analyzer-upload-title" className="text-sm font-medium text-ink">
          {isAnalyzing ? 'Choose another PDF' : 'Upload PDF'}
        </h3>
        <p id="analyzer-upload-description" className="text-[11px] text-ink-3 mt-1">
          {isAnalyzing
            ? 'The current analysis will be cancelled and safely replaced.'
            : `PDF · Up to ${MAX_ANALYSIS_FILE_MEGABYTES} MB · ${MAX_ANALYSIS_PAGES} pages`}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ANALYSIS_FILE_ACCEPT}
        className="hidden"
        aria-label="Choose a PDF for local CV analysis"
        onChange={handleChange}
      />
    </section>
  )
}
