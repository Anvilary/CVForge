import { describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { defaultResume, defaultSettings } from '@/features/cv/model/defaults'
import type { CVState } from '@/features/cv/model/types'
import { renderResumePdf } from './testing/renderPdfText'

function createTestCVState(): CVState {
  return {
    schemaVersion: '1.0.0',
    updatedAt: new Date().toISOString(),
    resume: {
      ...defaultResume,
      profile: {
        ...defaultResume.profile,
        name: 'Alex Morgan',
      },
      workExperience: [],
      projects: [],
    },
    settings: {
      ...defaultSettings,
      sectionOrder: ['workExperience', 'projects', 'education', 'skills'],
    },
  }
}

interface AnnotationInfo {
  subtype: string
  url: string | null
  rect: [number, number, number, number]
  overlaidText?: string
}

async function extractAnnotationsAndText(pdfBytes: Uint8Array) {
  const task = pdfjs.getDocument({ data: pdfBytes.slice(), verbosity: 0, useWorkerFetch: false })
  const pdf = await task.promise
  const page = await pdf.getPage(1)
  const rawAnnotations = await page.getAnnotations()
  const textContent = await page.getTextContent()

  const annotations: AnnotationInfo[] = rawAnnotations.map((a: { subtype?: string; url?: string; unsafeUrl?: string; rect?: number[]; overlaidText?: string }) => ({
    subtype: a.subtype ?? '',
    url: a.url ?? a.unsafeUrl ?? null,
    rect: (a.rect as [number, number, number, number]) ?? [0, 0, 0, 0],
    overlaidText: a.overlaidText,
  }))

  const textItems = textContent.items
    .filter((item): item is Extract<(typeof textContent.items)[number], { str: string }> => 'str' in item)
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
    }))

  await task.destroy()
  return { annotations, textItems }
}

describe('Work experience PDF links and annotations', () => {
  it('attaches company link to the organization text and leaves role non-clickable', async () => {
    const state = createTestCVState()
    state.resume.workExperience = [
      {
        id: 'work-1',
        role: 'Lead Maintainer',
        company: 'Odysseus · Self-Hosted AI Workspace',
        companyLink: 'https://github.com/odysseus-dev/odysseus',
        location: 'Remote',
        startDate: '2024-01',
        endDate: '',
        isCurrent: true,
        bullets: ['Maintained decentralized workspace runtime.'],
      },
    ]

    const bytes = await renderResumePdf(state)
    const { annotations, textItems } = await extractAnnotationsAndText(bytes)

    // Verify there is exactly one link annotation for this entry
    const linkAnnotations = annotations.filter((a) => a.subtype === 'Link')
    expect(linkAnnotations).toHaveLength(1)

    const link = linkAnnotations[0]
    expect(link.url).toMatch(/^https:\/\/github\.com\/odysseus-dev\/odysseus\/?$/)

    // Locate the role text and company text items
    const roleItem = textItems.find((t) => t.str.includes('Lead Maintainer'))
    const companyItem = textItems.find((t) => t.str.includes('Odysseus'))

    expect(roleItem).toBeDefined()
    expect(companyItem).toBeDefined()

    // In PDF coordinates: rect is [x1, y1, x2, y2]
    // The role item should start before the company item horizontally
    expect(roleItem!.x).toBeLessThan(companyItem!.x)

    // The link annotation rectangle should correspond to the company text, NOT the role text
    const [linkX1, , linkX2] = link.rect
    expect(linkX1).toBeGreaterThanOrEqual(companyItem!.x - 2)
    expect(linkX2).toBeGreaterThan(linkX1)
    // Link rect should not encompass the role text's horizontal position
    expect(linkX1).toBeGreaterThan(roleItem!.x + roleItem!.width / 2)
  })

  it('preserves project title link behavior', async () => {
    const state = createTestCVState()
    state.resume.projects = [
      {
        id: 'proj-1',
        name: 'CVForge',
        link: 'https://cvforge.anvilary.tools',
        startDate: '2024-01',
        endDate: '',
        bullets: ['Local-first CV tool.'],
      },
    ]

    const bytes = await renderResumePdf(state)
    const { annotations, textItems } = await extractAnnotationsAndText(bytes)

    const linkAnnotations = annotations.filter((a) => a.subtype === 'Link')
    // Project title and subtitle URL both receive links
    expect(linkAnnotations.length).toBeGreaterThanOrEqual(1)

    const projectTitleItem = textItems.find((t) => t.str === 'CVForge')
    expect(projectTitleItem).toBeDefined()

    const titleLink = linkAnnotations.find((a) => {
      const [x1, , x2] = a.rect
      return x1 <= projectTitleItem!.x && x2 >= projectTitleItem!.x + projectTitleItem!.width - 2
    })
    expect(titleLink).toBeDefined()
    expect(titleLink!.url).toMatch(/^https:\/\/cvforge\.anvilary\.tools\/?$/)
  })

  it('handles role only entries without generating link annotations', async () => {
    const state = createTestCVState()
    state.resume.workExperience = [
      {
        id: 'work-role-only',
        role: 'Independent Researcher',
        company: '',
        companyLink: 'https://example.com/should-not-link',
        location: 'Remote',
        startDate: '2023-01',
        endDate: '2023-12',
        isCurrent: false,
        bullets: [],
      },
    ]

    const bytes = await renderResumePdf(state)
    const { annotations, textItems } = await extractAnnotationsAndText(bytes)

    // Since company is empty, no company link should be rendered
    const linkAnnotations = annotations.filter((a) => a.subtype === 'Link')
    expect(linkAnnotations).toHaveLength(0)

    const roleItem = textItems.find((t) => t.str.includes('Independent Researcher'))
    expect(roleItem).toBeDefined()
  })

  it('handles company only entries with a valid link', async () => {
    const state = createTestCVState()
    state.resume.workExperience = [
      {
        id: 'work-company-only',
        role: '',
        company: 'Autonomous Systems Lab',
        companyLink: 'https://asl.example.org',
        location: '',
        startDate: '2022-01',
        endDate: '2022-12',
        isCurrent: false,
        bullets: [],
      },
    ]

    const bytes = await renderResumePdf(state)
    const { annotations, textItems } = await extractAnnotationsAndText(bytes)

    const linkAnnotations = annotations.filter((a) => a.subtype === 'Link')
    expect(linkAnnotations).toHaveLength(1)
    expect(linkAnnotations[0].url).toMatch(/^https:\/\/asl\.example\.org\/?$/)

    const companyItem = textItems.find((t) => t.str.includes('Autonomous Systems Lab'))
    expect(companyItem).toBeDefined()
  })

  it('handles company with missing or invalid URL safely without link annotations', async () => {
    const state = createTestCVState()
    state.resume.workExperience = [
      {
        id: 'work-no-url',
        role: 'Senior Engineer',
        company: 'Company No URL',
        companyLink: '',
        location: '',
        startDate: '2021',
        endDate: '2022',
        isCurrent: false,
        bullets: [],
      },
      {
        id: 'work-invalid-url',
        role: 'Staff Engineer',
        company: 'Company Bad URL',
        companyLink: 'javascript:alert(1)',
        location: '',
        startDate: '2020',
        endDate: '2021',
        isCurrent: false,
        bullets: [],
      },
      {
        id: 'work-ftp-url',
        role: 'Consultant',
        company: 'Company FTP',
        companyLink: 'ftp://files.example.org',
        location: '',
        startDate: '2019',
        endDate: '2020',
        isCurrent: false,
        bullets: [],
      },
    ]

    const bytes = await renderResumePdf(state)
    const { annotations, textItems } = await extractAnnotationsAndText(bytes)

    const linkAnnotations = annotations.filter((a) => a.subtype === 'Link')
    expect(linkAnnotations).toHaveLength(0)

    expect(textItems.find((t) => t.str.includes('Company No URL'))).toBeDefined()
    expect(textItems.find((t) => t.str.includes('Company Bad URL'))).toBeDefined()
    expect(textItems.find((t) => t.str.includes('Company FTP'))).toBeDefined()
  })
})
