'use client'

import { useState } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import type { PreviewExport } from '@/features/builder/preview/previewTypes'
import { resumePdfFileName } from './resumePdfFileName'
import { embedCVStateAttachment } from './embedCVStateAttachment'
import { announce } from '@/shared/utils/announce'
import { downloadBlob } from '@/shared/utils/downloadBlob'

interface DownloadPdfButtonProps {
  /** Resolves with the document currently on screen, once it is up to date. */
  exportDocument: () => Promise<PreviewExport>
}

// The download is the previewed PDF: the preview's own bytes plus the session
// attachment, never a second layout pass. If an edit is still being laid out,
// the download waits for it, so the file always matches a revision that was
// shown.
export function DownloadPdfButton({ exportDocument }: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      const { bytes, state } = await exportDocument()
      const base = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
      const withSession = await embedCVStateAttachment(base, state)
      downloadBlob(withSession, resumePdfFileName(state))
      announce('PDF export completed.')
    } catch (error) {
      console.error('PDF export failed.', error instanceof Error ? error.name : 'unknown')
      announce('PDF export failed. Review the current CV and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isGenerating}
      className="btn sm justify-center bg-bg-2/80 backdrop-blur-sm border-border shadow-sm"
    >
      <Icon name="download" size={13} />
      {isGenerating ? 'Preparing' : 'Download'}
    </button>
  )
}
