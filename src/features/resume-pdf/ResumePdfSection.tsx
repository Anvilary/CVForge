import { Text, View } from '@react-pdf/renderer'
import { type ReactNode } from 'react'
import { cleanList, cleanText } from '@/shared/utils/resume-formatting'
import { type PdfStyles } from './types'

// A real text glyph, so list structure survives text extraction (a drawn shape
// leaves no trace in the text layer). WinAnsi includes it, so core fonts render it.
const BULLET_GLYPH = '\u2022'
// A marker the user typed by hand would otherwise print twice.
// A bullet row stays on one page (a split would strand its marker), unless the
// bullet is long enough that it could be taller than a page.
const MAX_UNSPLIT_BULLET_LENGTH = 600
const LEADING_MARKER = /^[\u2022*-]\s+/

interface ResumePdfSectionProps {
  title: string
  styles: PdfStyles
  children: ReactNode
}

export function ResumePdfSection({ title, styles, children }: ResumePdfSectionProps) {
  const heading = cleanText(title) || 'Section'

  return (
    <View style={styles.section} minPresenceAhead={36}>
      <View style={styles.sectionHeader} wrap={false}>
        <View style={styles.sectionTick} />
        <Text style={styles.sectionTitleText}>{heading}</Text>
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  )
}

export function ResumePdfBullets({ bullets, styles, visible = true }: { bullets: string[]; styles: PdfStyles; visible?: boolean }) {
  if (!visible) return null
  const visibleBullets = cleanList(bullets).map((bullet) => bullet.replace(LEADING_MARKER, '')).filter(Boolean)

  if (visibleBullets.length === 0) return null

  return (
    <View style={styles.bulletList}>
      {visibleBullets.map((bullet, index) => (
        <View key={`${index}-${bullet}`} style={styles.bulletRow} wrap={bullet.length > MAX_UNSPLIT_BULLET_LENGTH}>
          <Text style={styles.bulletMarker}>{BULLET_GLYPH}</Text>
          <Text style={styles.bulletText} wrap>{bullet}</Text>
        </View>
      ))}
    </View>
  )
}

export function ResumePdfParagraph({ bullets, styles, visible = true }: { bullets: string[]; styles: PdfStyles; visible?: boolean }) {
  if (!visible) return null
  const lines = cleanList(bullets)
  if (lines.length === 0) return null

  const text = lines
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)
    .join(' ')

  if (!text) return null
  return <Text style={styles.paragraph} wrap>{text}</Text>
}
