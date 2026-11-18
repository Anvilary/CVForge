import { type CVState } from '@/features/cv/model/types'
import { cleanList, cleanText, formatDateRange } from '@/shared/utils/resume-formatting'

export function hasWorkContent(item: CVState['resume']['workExperience'][number], bulletsVisible: boolean) {
  return Boolean(
    cleanText(item.role)
    || cleanText(item.company)
    || cleanText(item.location)
    || formatDateRange(item.startDate, item.endDate, item.isCurrent)
    || (bulletsVisible && cleanList(item.bullets).length > 0),
  )
}

export function hasProjectContent(item: CVState['resume']['projects'][number], bulletsVisible: boolean) {
  return Boolean(
    cleanText(item.name)
    || cleanText(item.link)
    || formatDateRange(item.startDate, item.endDate)
    || (bulletsVisible && cleanList(item.bullets).length > 0),
  )
}

export function hasEducationContent(item: CVState['resume']['education'][number], detailsVisible: boolean) {
  return Boolean(
    cleanText(item.school)
    || cleanText(item.degree)
    || cleanText(item.location)
    || formatDateRange(item.startDate, item.endDate)
    || (detailsVisible && cleanList(item.details).length > 0),
  )
}
