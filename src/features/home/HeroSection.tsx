'use client'

import Link from 'next/link'
import { Icon } from '@/shared/components/ui/Icon'

interface HeroSectionProps {
  onCreateClick?: () => void
}

export function HeroSection({ onCreateClick }: HeroSectionProps) {
  return (
    <section className="hero container" aria-labelledby="home-title">
      <h1 id="home-title">
        Build, analyze, and improve your CV,{' '}
        <span className="accent">locally.</span>
      </h1>
      <p className="lede">
        Create a structured CV with browser autosave, reliable backup, and PDF
        export. Then use transparent ATS-style checks for actionable feedback
        without server-side CV storage.
      </p>
      <div className="ctas">
        <button type="button" onClick={onCreateClick} className="btn primary lg">
          Build your CV <Icon name="arrow-right" size={16} />
        </button>
        <Link href="/analyzer" className="btn lg">
          Analyze CV <Icon name="search" size={16} />
        </Link>
      </div>

      <div className="meta-row" aria-label="CVForge highlights">
        <span><Icon name="lock" size={14} /> No account required</span>
        <span><Icon name="device" size={14} /> Autosaved in this browser</span>
        <span><Icon name="file-text" size={14} /> PDF export</span>
        <span><Icon name="export" size={14} /> Reliable JSON backup</span>
      </div>
    </section>
  )
}
