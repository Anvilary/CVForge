import { expect, test, type Page } from '@playwright/test'
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { cvPayload, LONG_URL, openBuilderWithCV, previewCanvases, waitForFirstPreview } from './support/previewFixtures'
import { downloadBuilderPdf, extractPdf, joinWrapped, type ExtractedPdf } from './support/pdfText'
import { PAGE_PADDING_HORIZONTAL } from '../../src/features/resume-pdf/resumePdfGeometry'

const PDF_BOUNDARY_TOLERANCE_PT = 0.75

const DENSE_TECHNICAL_SKILLS = [
  'Requirements discovery',
  'Functional & technical specifications',
  'Acceptance criteria',
  'Architecture & code review',
  'AI-assisted implementation & verification',
  'React / Next.js / TypeScript / Node.js',
  'Python / FastAPI / REST',
  'PostgreSQL / Redis',
  'Docker / Linux / Git',
  'pytest / Playwright',
  'OpenAI GPT & Codex / Claude / Gemini',
  'Qwen / DeepSeek / GLM',
  'RAG / grounding',
]

const DENSE_WAYS_OF_WORKING = [
  'Inspect and frame first; define scope, contracts and acceptance criteria; isolate and delegate bounded work; verify diffs, tests, runtime behaviour and browser QA before integration; document decisions for async review',
]

const SUPPORTED_TEXT = 'Zoë Brontë, café, naïve, Ångström, Straße, “quotes”, ‘single’, • bullet, … and €'

const UNSUPPORTED_SCRIPTS = {
  polish: 'Łukasz Żółć',
  greek: 'Αθήνα',
  cyrillic: 'Москва',
  cjk: '東京',
  emoji: 'Launched 🚀',
}

async function openWithSummary(page: Page, summary: string, pages: 'one' | 'many' = 'one') {
  const payload = JSON.parse(cvPayload({ pages }))
  payload.resume.profile.summary = summary
  await openBuilderWithCV(page, JSON.stringify(payload))
  await waitForFirstPreview(page)
}

function characterNotice(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Some characters cannot be shown in the PDF' })
}

test('Western European text and typographic punctuation export exactly', async ({ page }) => {
  await openWithSummary(page, SUPPORTED_TEXT)
  await expect(characterNotice(page)).toHaveCount(0)
  const pdf = await extractPdf(await downloadBuilderPdf(page))
  expect(pdf.lines).toContain(SUPPORTED_TEXT)
})

for (const [script, sample] of Object.entries(UNSUPPORTED_SCRIPTS)) {
  test(`${script} text renders without errors and is disclosed before download`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await openWithSummary(page, sample)
    await expect(characterNotice(page)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Preview could not be updated' })).toHaveCount(0)
    const pdf = await extractPdf(await downloadBuilderPdf(page))
    expect(pdf.lines.length).toBeGreaterThan(5)
    expect(errors).toEqual([])
  })
}

test('a long URL stays inside the page and extracts in full', async ({ page }) => {
  await openWithSummary(page, 'Portfolio below.', 'many')
  const pdf = await extractPdf(await downloadBuilderPdf(page))
  const displayedUrl = LONG_URL.replace(/^https:\/\//, '')
  expect(joinWrapped(pdf.lines)).toContain(displayedUrl)
  expect(pdf.maxRight).toBeLessThanOrEqual(pdf.pageWidth)
})

test('an unbreakable token wraps inside the page instead of being clipped', async ({ page }) => {
  const token = 'https://example.org/' + 'A1b2C3d4E5f6G7h8'.repeat(9)
  await openWithSummary(page, `Portfolio: ${token}`)
  const pdf = await extractPdf(await downloadBuilderPdf(page))
  expect(joinWrapped(pdf.lines)).toContain(token)
  expect(pdf.maxRight).toBeLessThanOrEqual(pdf.pageWidth)
})


function expectInsidePrintableBounds(pdf: ExtractedPdf) {
  expect(pdf.textItems.length).toBeGreaterThan(0)

  for (const item of pdf.textItems) {
    const printableLeft = PAGE_PADDING_HORIZONTAL
    const printableRight = item.pageWidth - PAGE_PADDING_HORIZONTAL

    expect(
      item.left,
      `page ${item.pageNumber}: "${item.str}" begins at ${item.left}, before printable left ${printableLeft}`,
    ).toBeGreaterThanOrEqual(printableLeft - PDF_BOUNDARY_TOLERANCE_PT)

    expect(
      item.right,
      `page ${item.pageNumber}: "${item.str}" ends at ${item.right}, after printable right ${printableRight}`,
    ).toBeLessThanOrEqual(printableRight + PDF_BOUNDARY_TOLERANCE_PT)
  }
}

async function pdfUriAnnotations(bytes: Buffer) {
  const pdf = await PDFDocument.load(bytes)
  const uris: string[] = []
  for (const page of pdf.getPages()) {
    const annotations = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
    for (const ref of annotations?.asArray() ?? []) {
      const dictionary = pdf.context.lookup(ref, PDFDict)
      const action = dictionary.lookupMaybe(PDFName.of('A'), PDFDict)
      const uri = action?.lookup(PDFName.of('URI'))
      if (uri instanceof PDFString || uri instanceof PDFHexString) uris.push(uri.decodeText())
    }
  }
  return uris
}

test('work, project, and contact links export selectable text and valid URI annotations', async ({ page }) => {
  const payload = JSON.parse(cvPayload())
  Object.assign(payload.resume.profile, {
    website: '  https://portfolio.example.org/work?q=1  ',
    github: 'github.example.org/candidate',
    linkedin: 'http://intranet.example.org/candidate',
  })
  payload.resume.workExperience[0].companyLink = 'company.example.org/careers'
  payload.resume.workExperience.push({
    ...payload.resume.workExperience[0],
    id: 'company-only',
    role: '',
    company: 'Company Only',
    companyLink: 'https://other.example.org/',
  })
  payload.resume.projects = [
    { id: 'linked', name: 'Selectable Project', link: 'https://project.example.org/' },
    { id: 'unsafe', name: 'Unlinked Project', link: 'data:text/plain,unsafe' },
    { id: 'malformed', name: 'Malformed Link Project', link: 'https:///invalid.example.org' },
  ]
  await openBuilderWithCV(page, JSON.stringify(payload))
  await waitForFirstPreview(page)

  const bytes = await downloadBuilderPdf(page)
  const pdf = await extractPdf(bytes)
  const text = joinWrapped(pdf.lines)
  for (const label of ['Senior Software Engineer', 'Example Organization 1', 'Company Only', 'Selectable Project', 'Unlinked Project', 'Malformed Link Project']) {
    expect(text).toContain(label)
  }
  expect(text).toContain('portfolio.example.org/work?q=1')
  expect(text).not.toContain('https://portfolio.example.org')
  expectInsidePrintableBounds(pdf)

  const uris = await pdfUriAnnotations(bytes)
  expect(uris.filter((uri) => !uri.startsWith('tel:')).sort()).toEqual([
    'http://intranet.example.org/candidate',
    'https://company.example.org/careers',
    'https://github.example.org/candidate',
    'https://other.example.org/',
    'https://portfolio.example.org/work?q=1',
    'https://project.example.org/',
    'https://project.example.org/',
    'mailto:zoe@example.org',
  ])
})

test('rejected contact URLs stay selectable without PDF annotations', async ({ page }) => {
  const payload = JSON.parse(cvPayload())
  Object.assign(payload.resume.profile, {
    website: 'javascript:disabled',
    github: 'data:text/plain,disabled',
    linkedin: 'https://user:password@example.org',
  })
  await openBuilderWithCV(page, JSON.stringify(payload))
  await waitForFirstPreview(page)

  const bytes = await downloadBuilderPdf(page)
  const text = joinWrapped((await extractPdf(bytes)).lines)
  expect(text).toContain('javascript:disabled')
  expect(text).toContain('data:text/plain,disabled')
  expect(text).toContain('user:password@example.org')
  expect((await pdfUriAnnotations(bytes)).filter((uri) => !uri.startsWith('tel:'))).toEqual(['mailto:zoe@example.org'])
})

function denseSkillsPayload(
  documentSize: 'A4' | 'Letter',
  fontFamily: 'Lexend' | 'Times New Roman',
  longToken = '',
) {
  const payload = JSON.parse(cvPayload({ documentSize }))
  payload.resume.profile.name = 'Alexandre Teixeira'
  payload.resume.profile.email = 'general@alexandreteixeira.dev'
  payload.resume.profile.phone = '+351 915 762 282'
  payload.resume.profile.location = 'Guimarães, Portugal'
  payload.resume.profile.website = 'alexandreteixeira.dev'
  payload.resume.profile.github = 'https://github.com/alteixeira20'
  payload.resume.profile.linkedin = 'https://www.linkedin.com/in/alexandreteixeira20'
  payload.resume.profile.summary =
    'AI-Augmented Product Engineer working across product architecture, implementation, automated testing, review, deployment, and independent verification.'
  payload.resume.skills = {
    technical: longToken
      ? [...DENSE_TECHNICAL_SKILLS, longToken]
      : DENSE_TECHNICAL_SKILLS,
    soft: DENSE_WAYS_OF_WORKING,
    featured: [],
    featuredWithRating: [],
  }
  payload.settings = {
    ...payload.settings,
    documentSize,
    fontFamily,
    fontSize: 9.4,
    nameFontSize: 16,
    sectionHeadingSize: 10.5,
    lineHeight: 1.372,
    sectionSpacing: 12,
    profileSpacing: 4,
  }
  return JSON.stringify(payload)
}

for (const documentSize of ['A4', 'Letter'] as const) {
  for (const fontFamily of ['Lexend', 'Times New Roman'] as const) {
    test(`dense Skills and Ways of Working stay inside printable ${documentSize} bounds with ${fontFamily}`, async ({ page }) => {
      await openBuilderWithCV(page, denseSkillsPayload(documentSize, fontFamily))
      await waitForFirstPreview(page)

      await expect(page.getByRole('status').filter({ hasText: 'Preview could not be updated' })).toHaveCount(0)
      expect(await previewCanvases(page).count()).toBe(1)

      const pdf = await extractPdf(await downloadBuilderPdf(page))
      expect(joinWrapped(pdf.lines)).toContain('Requirements discovery')
      expect(joinWrapped(pdf.lines)).toContain('Inspect and frame first')
      expectInsidePrintableBounds(pdf)
    })
  }
}

test('a long unbroken Skills token wraps inside the printable A4 bounds', async ({ page }) => {
  const token = 'repo-' + 'A1b2C3d4E5f6G7h8'.repeat(10)

  await openBuilderWithCV(page, denseSkillsPayload('A4', 'Lexend', token))
  await waitForFirstPreview(page)

  const pdf = await extractPdf(await downloadBuilderPdf(page))
  expect(joinWrapped(pdf.lines)).toContain(token)
  expectInsidePrintableBounds(pdf)
})

test('a long unbroken Skills token wraps inside the printable Letter bounds', async ({ page }) => {
  const token = 'repo-' + 'A1b2C3d4E5f6G7h8'.repeat(10)

  await openBuilderWithCV(page, denseSkillsPayload('Letter', 'Lexend', token))
  await waitForFirstPreview(page)

  const pdf = await extractPdf(await downloadBuilderPdf(page))
  expect(joinWrapped(pdf.lines)).toContain(token)
  expectInsidePrintableBounds(pdf)
})

test('section headings and skill keywords export as intact text from the real download', async ({ page }) => {
  const payload = JSON.parse(cvPayload())
  payload.resume.skills = {
    technical: ['TypeScript', 'React', 'PostgreSQL', 'Docker', 'Terraform', 'GitHub Actions', 'CI/CD', 'REST/GraphQL'],
    soft: ['Communication'],
  }
  await openBuilderWithCV(page, JSON.stringify(payload))
  await waitForFirstPreview(page)

  const pdf = await extractPdf(await downloadBuilderPdf(page))
  // Strict: no hyphen stripping and no joining of split letters.
  expect(pdf.lines).toContain('WORK EXPERIENCE')
  expect(pdf.lines).toContain('SKILLS')
  expect(pdf.lines.filter((line) => /^(?:\p{Lu} ){3,}\p{Lu}$/u.test(line.trim()))).toEqual([])
  expect(pdf.lines.filter((line) => /[\p{L}\p{N}/]-$/u.test(line.trim()))).toEqual([])
  const text = pdf.lines.join(' ')
  for (const keyword of ['TypeScript', 'React', 'PostgreSQL', 'Docker', 'Terraform', 'GitHub Actions', 'CI/CD', 'REST/GraphQL']) {
    expect(text).toContain(keyword)
  }
})
