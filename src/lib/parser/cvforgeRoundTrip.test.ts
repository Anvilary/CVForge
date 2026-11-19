import { beforeAll, describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { renderResumePdf } from '@/features/resume-pdf/testing/renderPdfText'
import { buildFixtureState, fixtureContent, type FixtureFont, type FixtureLanguage } from '@/features/resume-pdf/testing/pdfIntegrityFixtures'
import { type CVState } from '@/features/cv/model/types'
import { extractPdfText } from './pdfTextExtraction'
import { parseHeuristicResume, type HeuristicResult } from './heuristicResumeParser'

// Gate B: structured CV -> real PDF export -> CVForge's own extraction -> heuristic
// parser -> draft. The embedded session is never involved: the document is rendered
// without it, so this is the path an external PDF takes.

async function roundTrip(state: CVState): Promise<HeuristicResult> {
  const task = pdfjs.getDocument({ data: await renderResumePdf(state), verbosity: 0, useWorkerFetch: false })
  try {
    const extraction = await extractPdfText(await task.promise, pdfjs.OPS)
    const result = parseHeuristicResume(extraction.text)
    if (!result) throw new Error('The parser returned no result.')
    return result
  } finally {
    await task.destroy()
  }
}

const MATRIX: Array<{ font: FixtureFont, language: FixtureLanguage, size: 'A4' | 'Letter' }> = [
  { font: 'Helvetica', language: 'en', size: 'A4' },
  { font: 'Times New Roman', language: 'en', size: 'Letter' },
  { font: 'Courier New', language: 'en', size: 'A4' },
  { font: 'Helvetica', language: 'pt', size: 'A4' },
  { font: 'Times New Roman', language: 'pt', size: 'Letter' },
  { font: 'Courier New', language: 'pt', size: 'A4' },
]

describe.each(MATRIX)('CVForge export parsed without its session ($font, $language, $size)', ({ font, language, size }) => {
  const content = fixtureContent(language)
  const state = buildFixtureState({ font, language, size, jobs: 3 })
  let draft: HeuristicResult['draft']['resume']

  beforeAll(async () => { draft = (await roundTrip(state)).draft.resume })

  it('recovers the contact details and summary', () => {
    expect(draft.profile).toMatchObject({
      name: content.profile.name,
      email: content.profile.email,
      phone: content.profile.phone,
      location: content.profile.location,
      website: content.profile.website,
      github: `https://${content.profile.github}`,
      linkedin: content.profile.linkedin,
      summary: content.summary,
    })
  })

  it('separates role, company, location, dates and bullets for every position', () => {
    const expected = state.resume.workExperience
    expect(draft.workExperience).toHaveLength(expected.length)
    expected.forEach((job, index) => {
      expect(draft.workExperience[index], job.company).toMatchObject({
        role: job.role,
        company: job.company,
        location: job.location,
        startDate: job.startDate,
        endDate: job.isCurrent ? 'Present' : job.endDate,
        isCurrent: job.isCurrent,
        bullets: job.bullets,
      })
    })
  })

  it('recovers education, projects, skills, languages and the custom section', () => {
    expect(draft.education.map(({ school, degree, location, startDate, endDate, details }) => ({ school, degree, location, startDate, endDate, details })))
      .toEqual(content.education)
    expect(draft.projects.map(({ name, link, startDate, endDate, bullets }) => ({ name, link, startDate, endDate, bullets })))
      .toEqual([{ ...content.project, startDate: 'Mar 2022', endDate: 'Jan 2023' }])
    expect(draft.skills.technical).toEqual([...content.technicalSkills, ...content.softSkills])
    expect(draft.languages.map(({ name, proficiency }) => ({ name, proficiency }))).toEqual(content.languages)
    expect(draft.customSections).toHaveLength(1)
    expect(draft.customSections[0].bullets).toEqual(content.custom.bullets)
  })
})

describe('a multi-page CVForge export parsed without its session', () => {
  it.each([
    { font: 'Helvetica', size: 'A4' },
    { font: 'Courier New', size: 'Letter' },
  ] as const)('keeps every position and bullet across page breaks ($font, $size)', async ({ font, size }) => {
    const state = buildFixtureState({ font, size, jobs: 12 })
    const draft = (await roundTrip(state)).draft.resume
    expect(draft.workExperience.map(({ role, company, startDate, bullets }) => ({ role, company, startDate, bullets })))
      .toEqual(state.resume.workExperience.map(({ role, company, startDate, bullets }) => ({ role, company, startDate, bullets })))
  })
})
