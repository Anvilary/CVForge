import type { Metadata } from 'next'
import { preload } from 'react-dom'
import { CVProvider } from '@/features/cv/state/CVContext'
import { LiveAnnouncements } from '@/shared/components/accessibility/LiveAnnouncements'
import { siteConfig } from '@/shared/utils/siteConfig'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s | CVForge',
  },
  description: siteConfig.description,
  applicationName: siteConfig.applicationName,
  authors: [{ name: siteConfig.organizationName, url: siteConfig.familyUrl }],
  creator: siteConfig.organizationName,
  publisher: siteConfig.organizationName,
  keywords: [
    'CV builder',
    'resume builder',
    'free CV builder',
    'online resume builder',
    'CV builder with PDF export',
    'resume builder with live preview',
    'ATS-style CV analyzer',
    'ATS resume checker',
    'private resume builder',
    'browser-based CV builder',
    'CV builder without account',
    'resume PDF analyzer',
    'JSON backup',
    'local-first',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'CVForge: Free CV Builder & ATS-Style Resume Analyzer',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: ['/opengraph-image'],
  },
  // Official Anvilary Tools v2.1 browser icons.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/anvilary-tools-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/anvilary-tools-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/anvilary-tools-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  category: 'business',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  preload('/fonts/lexend-latin.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  return (
    <html lang="en">
      <body>
        <CVProvider>
          {children}
          <LiveAnnouncements />
        </CVProvider>
      </body>
    </html>
  )
}
