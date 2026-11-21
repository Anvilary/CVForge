import { Link, Text, View } from '@react-pdf/renderer'
import { cleanText } from '@/shared/utils/resume-formatting'
import { type PdfStyles } from './types'
import { resolveEntryLink } from './resolveEntryLink'

interface ResumePdfEntryProps {
  title?: string
  titleLink?: unknown
  organization?: string
  organizationLink?: unknown
  subtitle?: string
  dates?: string
  styles: PdfStyles
}

export function ResumePdfEntry({
  title,
  titleLink,
  organization,
  organizationLink,
  subtitle,
  dates,
  styles,
}: ResumePdfEntryProps) {
  const cleanTitle = cleanText(title)
  const cleanOrganization = cleanText(organization)
  const cleanSubtitle = cleanText(subtitle)
  const cleanDates = cleanText(dates)

  if (!cleanTitle && !cleanOrganization && !cleanSubtitle && !cleanDates) return null

  const resolvedTitleLink = resolveEntryLink(titleLink)
  const resolvedOrganizationLink = resolveEntryLink(organizationLink)

  return (
    <View style={styles.entry} wrap={false}>
      {(cleanTitle || cleanOrganization || cleanDates) && (
        <View style={styles.entryRow}>
          <EntryTitle
            title={cleanTitle}
            titleLink={resolvedTitleLink}
            organization={cleanOrganization}
            organizationLink={resolvedOrganizationLink}
            styles={styles}
          />
          {cleanDates && <Text style={styles.entryDates}>{cleanDates}</Text>}
        </View>
      )}
      {cleanSubtitle && <Subtitle text={cleanSubtitle} styles={styles} />}
    </View>
  )
}

interface EntryTitleProps {
  title: string
  titleLink: string | null
  organization: string
  organizationLink: string | null
  styles: PdfStyles
}

function EntryTitle({ title, titleLink, organization, organizationLink, styles }: EntryTitleProps) {
  if (!title && !organization) return <Text />

  return (
    <Text style={styles.entryTitle}>
      {title ? (titleLink ? <Link src={titleLink} style={styles.entryTitleLink}>{title}</Link> : title) : null}
      {title && organization ? <Text style={styles.entryOrg}> · </Text> : null}
      {organization ? (
        organizationLink
          ? <Link src={organizationLink} style={styles.entryOrgLink}>{organization}</Link>
          : <Text style={styles.entryOrg}>{organization}</Text>
      ) : null}
    </Text>
  )
}

function Subtitle({ text, styles }: { text: string; styles: PdfStyles }) {
  const href = resolveEntryLink(text)
  if (href) {
    return (
      <Link src={href} style={[styles.entrySubtitle, styles.link]} wrap>
        {text}
      </Link>
    )
  }

  return <Text style={styles.entrySubtitle}>{text}</Text>
}
