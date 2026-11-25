import type { Metadata } from 'next'
import { ParserWorkbench } from '@/features/parser/workbench/ParserWorkbench'
import { ANALYZER_DESCRIPTION, ANALYZER_TITLE } from '@/shared/utils/siteConfig'

export const metadata: Metadata = {
  title: {
    absolute: ANALYZER_TITLE,
  },
  description: ANALYZER_DESCRIPTION,
  alternates: {
    canonical: '/analyzer',
  },
  openGraph: {
    type: 'website',
    url: '/analyzer',
    siteName: 'CVForge',
    title: ANALYZER_TITLE,
    description: ANALYZER_DESCRIPTION,
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'CVForge: Free CV Builder & ATS-Style Resume Analyzer',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: ANALYZER_TITLE,
    description: ANALYZER_DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

export default function AnalyzerPage() {
  return <ParserWorkbench />
}
