'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AppHeader } from '@/shared/components/layout/AppHeader'
import { EmberBackground } from '@/shared/components/ui/EmberBackground'
import { WorkbenchShell } from '@/shared/components/workbench/WorkbenchShell'
import { WorkbenchNotices } from '@/features/import-export/WorkbenchNotices'
import { useCV } from '@/features/cv/state/CVContext'
import { ExtractionDiagnostics } from '../diagnostics/ExtractionDiagnostics'
import { TextPreview } from '../diagnostics/TextPreview'
import { ScorePanel } from '../score/ScorePanel'
import { SourcePdfPreview } from '../source/SourcePdfPreview'
import { PdfUploadPanel } from '../upload/PdfUploadPanel'
import { ParserRestoreAction } from '../upload/ParserRestoreAction'
import { ParserHeuristicAction } from '../upload/ParserHeuristicAction'
import { type ParserDocument } from '../upload/parserTypes'
import { useParserDocument } from '../upload/useParserDocument'
import { BuilderSourceNotice } from './BuilderSourceNotice'
import { type ParserAnalysisTarget } from './parserAnalysisTypes'
import { resolveParserAnalysisTarget } from './resolveParserAnalysisTarget'

import { Icon } from '@/shared/components/ui/Icon'
import { WorkbenchHeader } from '@/shared/components/workbench/WorkbenchHeader'

export function ParserWorkbench() {
  const { state } = useCV()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromBuilder = searchParams.get('source') === 'builder'
  const { document, isAnalyzing, announcement, handleFile, clearDocument } = useParserDocument()
  const analysis = resolveParserAnalysisTarget(state, document, fromBuilder)

  const handleClear = () => {
    clearDocument()
    if (fromBuilder) {
      router.replace('/analyzer', { scroll: false })
    }
  }

  return (
    <div className="app-shell h-screen overflow-hidden">
      <EmberBackground subdued />
      <AppHeader title="CV Analyzer" />
      <WorkbenchShell
        leftPanel={(
          <ParserAnalysisPanel
            document={document}
            isAnalyzing={isAnalyzing}
            analysis={analysis}
            announcement={announcement}
            fromBuilder={fromBuilder}
            onFile={handleFile}
            onClearFile={handleClear}
          />
        )}
        rightPanel={<SourcePdfPreview document={document} />}
        leftLabel="Analysis"
        rightLabel="Source"
        variant="builder"
        notice={<WorkbenchNotices />}
      />
    </div>
  )
}

function ParserAnalysisPanel(props: {
  document: ParserDocument | null
  isAnalyzing: boolean
  analysis: ParserAnalysisTarget
  announcement: string
  fromBuilder: boolean
  onFile: (file: File) => void
  onClearFile: () => void
}) {
  const hasDocument = Boolean(props.document)

  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy={props.isAnalyzing}>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {props.announcement}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <WorkbenchHeader
          eyebrow="Workbench / Analyzer"
          eyebrowClassName="crumbline block"
          title="Analyze your CV"
          description="Check PDF readability, structure, and content locally."
          descriptionClassName="muted text-[11px] leading-relaxed text-ink-3 mt-1 block max-w-xl"
          actionsClassName="shrink-0 flex items-stretch sm:self-stretch w-full sm:w-auto"
          actions={(
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full sm:w-auto sm:self-stretch">
              {props.document && (
                <span
                  className="hidden xl:inline-flex items-center text-[10px] font-mono text-ink-3 bg-bg-2 border border-border px-2.5 py-1 rounded max-w-[140px] truncate self-center"
                  title={props.document.fileName}
                >
                  {props.document.fileName}
                </span>
              )}
              <PdfUploadPanel
                isAnalyzing={props.isAnalyzing}
                onFile={props.onFile}
                hasDocument={hasDocument}
                compact
              />
              {props.document && (
                <button
                  type="button"
                  onClick={props.onClearFile}
                  className="btn sm bg-bg-3 border-border-strong hover:border-border px-3 !h-auto min-h-[44px] sm:min-h-0 sm:self-stretch text-xs font-medium inline-flex items-center justify-center gap-1.5 shrink-0"
                  title="Clear uploaded PDF"
                  aria-label="Clear PDF"
                >
                  <Icon name="x" size={13} className="shrink-0" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          )}
        />

        <div className="p-5 lg:p-8 pt-6 space-y-6 pb-20">
          {props.isAnalyzing && (
            <div className="rounded-xl border border-ember/20 bg-ember/5 p-4 flex items-center gap-3 text-xs text-ember" role="status">
              <Icon name="activity" size={16} className="animate-spin text-ember shrink-0" />
              <span>Analyzing PDF… extracting text and running local structural checks.</span>
            </div>
          )}

          {props.document?.sessionError && (
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100" role="alert">
              {props.document.sessionError}
            </p>
          )}

          {props.fromBuilder && !props.document && (
            <BuilderSourceNotice analysis={props.analysis} />
          )}

          {props.document?.embeddedState && (
            <ParserRestoreAction embeddedState={props.document.embeddedState} />
          )}

          {!props.document?.embeddedState && props.document?.heuristic && (
            <ParserHeuristicAction result={props.document.heuristic} />
          )}

          <ExtractionDiagnostics document={props.document} />
          <ScorePanel result={props.analysis.score} target={props.analysis.target} />
          <TextPreview document={props.document} />
        </div>
      </div>
    </div>
  )
}
