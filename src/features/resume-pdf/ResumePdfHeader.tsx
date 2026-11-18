import { Link, Text, View } from '@react-pdf/renderer'
import { type Profile, type Settings } from '@/features/cv/model/types'
import { cleanText } from '@/shared/utils/resume-formatting'
import { ResumePdfIcon, type ResumePdfIconName } from './ResumePdfIcons'
import { resolveEntryLink } from './resolveEntryLink'
import { type PdfStyles } from './types'

interface HeaderProps {
  profile: Profile
  settings: Settings
  styles: PdfStyles
}

interface ContactItem {
  icon: ResumePdfIconName
  value: string
  href?: string
}

function buildContactItems(profile: Profile): ContactItem[] {
  return [
    contactItem('email', profile.email, emailHref),
    contactItem('phone', profile.phone),
    contactItem('location', profile.location),
    contactItem('website', profile.website, resolveEntryLink, displayUrl),
    contactItem('github', profile.github, resolveEntryLink, displayUrl),
    contactItem('linkedin', profile.linkedin, resolveEntryLink, displayUrl),
  ]
    .filter((item) => item.value)
}

function contactItem(
  icon: ResumePdfIconName,
  value: string,
  hrefFactory?: (value: string) => string | null,
  displayFactory?: (value: string) => string,
): ContactItem {
  const cleaned = cleanText(value)
  const displayValue = cleaned && displayFactory ? displayFactory(cleaned) : cleaned
  return { icon, value: displayValue, href: hrefFactory?.(cleaned) ?? undefined }
}

function emailHref(value: string) {
  return value ? `mailto:${value}` : null
}

function displayUrl(value: string) {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function ContactBlock({ items, styles, color }: { items: ContactItem[]; styles: PdfStyles; color: string }) {
  return (
    <View style={styles.contactWrap}>
      {items.map((item) => (
        <View key={`${item.icon}-${item.value}`} style={styles.contactItem}>
          <View style={styles.contactIcon}>
            <ResumePdfIcon name={item.icon} color={color} />
          </View>
          {item.href
            ? <Link src={item.href} style={styles.contactValue}>{item.value}</Link>
            : <Text style={styles.contactValue}>{item.value}</Text>}
        </View>
      ))}
    </View>
  )
}

export function ResumePdfHeader({ profile, settings, styles }: HeaderProps) {
  const name = cleanText(profile.name)
  const summary = cleanText(profile.summary)
  const contactItems = buildContactItems(profile)

  if (!name && contactItems.length === 0 && !summary) return null

  return (
    <View style={styles.header}>
      {(settings.topBarHeight ?? 3) > 0 && <View style={styles.accentRule} />}
      {name && <Text style={styles.name}>{name}</Text>}
      {contactItems.length > 0 && <ContactBlock items={contactItems} styles={styles} color={settings.themeColor} />}
      {summary && <Text style={styles.summary}>{summary}</Text>}
    </View>
  )
}
