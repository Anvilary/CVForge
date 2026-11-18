import { expect, test, type Dialog, type Locator, type Page } from '@playwright/test'
import {
  PDFDocument,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import { defaultCVState } from '../../src/features/cv/model/defaults'
import { MAX_JSON_IMPORT_BYTES } from '../../src/features/import-export/importCVState'
import { CV_STATE_KEY, readStorage, savedProfileName, seedStorage } from './support/cvStorage'
import { downloadBuilderPdf } from './support/pdfText'

type RunPart = string | number

// Writes one line as a TJ array, the way older CVForge (react-pdf) exports did:
// a space glyph followed by a large pull-back is a phantom space inside a word.
function drawRun(pdf: PDFDocument, page: PDFPage, font: PDFFont, parts: RunPart[], x: number, y: number) {
  const fontName = page.node.newFontDictionary(font.name, font.ref)
  const array = pdf.context.obj(parts.map((part) => (typeof part === 'number' ? PDFNumber.of(part) : font.encodeText(part))))
  page.pushOperators(
    PDFOperator.of(PDFOperatorNames.BeginText),
    PDFOperator.of(PDFOperatorNames.SetFontAndSize, [fontName, PDFNumber.of(10)]),
    PDFOperator.of(PDFOperatorNames.MoveText, [PDFNumber.of(x), PDFNumber.of(y)]),
    PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [array]),
    PDFOperator.of(PDFOperatorNames.EndText),
  )
}

async function olderCVForgePdf(session?: string) {
  const pdf = await PDFDocument.create()
  pdf.setCreator('react-pdf')
  pdf.setProducer('CVForge')
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage([595, 842])
  const line = (parts: RunPart[], y: number, x = 48) => drawRun(pdf, page, font, parts, x, y)

  line(['Casey Morgan'], 790)
  line(['casey@example.org'], 772)
  line(['Engineer completing an intensive systems progra ', 247.56, 'mming curriculum at 42 P ', 247.56, 'orto,'], 750)
  line(['with hands-on expe ', 247.56, 'rience building parsers and backends in C and Python.'], 738)
  line(['EXPERIENCE'], 710)
  line(['Acme Corp'], 692)
  line(['Platform Engineer'], 678)
  line(['Jan 2020 - Mar 20 ', 247.56, '23'], 678, 440)
  line(['•'], 664, 54)
  line(['Built a deployment pipeline that reduced release time by 40% for ten te ', 247.56, 'ams.'], 664, 64)
  line(['EDUCATION'], 636)
  line(['Example University'], 618)
  line(['BSc Computer Science'], 604)
  line(['2015 - 2019'], 604, 440)
  if (session !== undefined) {
    await pdf.attach(Buffer.from(session), 'cvforge-state.json', { mimeType: 'application/json' })
  }
  return Buffer.from(await pdf.save())
}

async function importPdf(page: Page, buffer: Buffer) {
  await page.getByRole('button', { name: 'Import' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose File' }).click()
  await (await chooser).setFiles({ name: 'older-cvforge.pdf', mimeType: 'application/pdf', buffer })
  await expect(page.getByText('Best-Effort Draft Review')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Create Editable Draft' }).click()
}

function backup(name: string) {
  return JSON.stringify({
    ...defaultCVState,
    resume: { ...defaultCVState.resume, profile: { ...defaultCVState.resume.profile, name } },
  })
}

async function openImport(page: Page) {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  return page.getByRole('dialog', { name: 'Import CV Data' })
}

function importInput(page: Page) {
  return page.getByLabel('Choose a JSON backup or PDF resume to import')
}

async function deferImportRead(
  input: Locator,
  name: string,
  contents: string | number[],
  method: 'text' | 'arrayBuffer' | 'signature' = 'text',
) {
  await input.evaluate(async (element: HTMLInputElement, { name, contents, method }) => {
    const data = new DataTransfer()
    const bytes = typeof contents === 'string' ? contents : new Uint8Array(contents)
    data.items.add(new File([bytes], name))
    element.files = data.files
    const file = element.files[0]
    let markStarted: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const release = new Promise<string | ArrayBuffer>((resolve) => {
      document.addEventListener(`release-import:${name}`, () => {
        resolve(typeof bytes === 'string' ? bytes : bytes.buffer)
      }, { once: true })
    })
    const read = () => {
      markStarted()
      return release
    }
    if (method === 'signature') {
      Object.defineProperty(file, 'slice', { value: () => ({ arrayBuffer: read }) })
    } else {
      Object.defineProperty(file, method, { value: read })
    }
    element.dispatchEvent(new Event('change', { bubbles: true }))
    await started
  }, { name, contents, method })
}

async function releaseImportRead(page: Page, name: string) {
  await page.evaluate(async (name) => {
    document.dispatchEvent(new Event(`release-import:${name}`))
    // Let the read, its continuation, and React's next render run.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }, name)
}

test('older import completion preserves a newer active read and its eventual review', async ({ page }) => {
  await seedStorage(page, { [CV_STATE_KEY]: backup('Saved Owner') })
  await page.goto('/builder')
  const dialog = await openImport(page)
  const input = importInput(page)
  await deferImportRead(input, 'older.json', backup('Outdated Owner'))
  await deferImportRead(input, 'superseded.json', backup('Superseded Owner'))
  await deferImportRead(input, 'latest.json', backup('Intended Owner'))

  await releaseImportRead(page, 'older.json')
  await expect(dialog.getByRole('status')).toContainText('Analyzing')
  await expect(dialog.getByRole('button', { name: /Replace current CV/ })).toHaveCount(0)
  await releaseImportRead(page, 'latest.json')
  await expect(dialog.getByText('Intended Owner')).toBeVisible()
  await releaseImportRead(page, 'superseded.json')
  await expect(dialog.getByText('Intended Owner')).toBeVisible()
  await expect.poll(() => savedProfileName(page)).toBe('Saved Owner')
  await dialog.getByRole('button', { name: 'Replace current CV & Restore' }).click()
  await expect.poll(() => savedProfileName(page)).toBe('Intended Owner')
})

test('an older import rejection preserves the newer file error and allows retry and cancel', async ({ page }) => {
  await seedStorage(page, { [CV_STATE_KEY]: backup('Saved Owner') })
  await page.goto('/builder')
  const dialog = await openImport(page)
  const input = importInput(page)
  await expect(dialog.getByRole('button', { name: 'Choose File' })).toHaveAccessibleDescription(/up to 5 MiB/)
  await deferImportRead(input, 'older.json', '{broken')
  await input.setInputFiles({
    name: 'oversized.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(MAX_JSON_IMPORT_BYTES + 1),
  })
  await expect(dialog.getByRole('alert')).toContainText('exceeds the 5 MiB file size limit')
  await releaseImportRead(page, 'older.json')
  await expect(dialog.getByRole('alert')).toContainText('exceeds the 5 MiB file size limit')

  await input.setInputFiles({
    name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(backup('Retry Owner')),
  })
  await expect(dialog.getByText('Retry Owner')).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Choose File' })).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await expect.poll(() => savedProfileName(page)).toBe('Saved Owner')
})

test('closing a pending PDF import and reopening starts a fresh review', async ({ page }) => {
  await seedStorage(page, { [CV_STATE_KEY]: backup('Saved Owner') })
  await page.goto('/builder')
  const dialog = await openImport(page)
  await deferImportRead(importInput(page), 'pending.pdf', [...await olderCVForgePdf()], 'arrayBuffer')
  await expect(dialog.getByRole('status')).toContainText('Analyzing')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await openImport(page)
  await expect(dialog.getByRole('button', { name: 'Choose File' })).toBeVisible()

  await importInput(page).setInputFiles({
    name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(backup('New Review')),
  })
  await expect(dialog.getByText('New Review')).toBeVisible()
  await releaseImportRead(page, 'pending.pdf')
  await expect(dialog.getByText('New Review')).toBeVisible()
  await expect.poll(() => savedProfileName(page)).toBe('Saved Owner')
})

test('navigating away during a file read clears its import workflow', async ({ page }) => {
  await seedStorage(page, { [CV_STATE_KEY]: backup('Saved Owner') })
  await page.goto('/builder')
  const dialog = await openImport(page)
  await deferImportRead(importInput(page), 'pending.json', backup('Abandoned Owner'))
  const nav = page.locator('.app-header')
  await nav.getByRole('link', { name: 'Analyzer', exact: true }).evaluate((link: HTMLElement) => link.click())
  await expect(page).toHaveURL(/\/analyzer$/)
  await expect(dialog).toHaveCount(0)
  await releaseImportRead(page, 'pending.json')
  await nav.getByRole('link', { name: 'Builder', exact: true }).click()
  await openImport(page)
  await expect(dialog.getByRole('button', { name: 'Choose File' })).toBeVisible()
  await expect.poll(() => savedProfileName(page)).toBe('Saved Owner')
})

test('a future embedded session is explained in Builder and Analyzer without a draft', async ({ page }) => {
  await seedStorage(page, { [CV_STATE_KEY]: backup('Saved Owner') })
  await page.goto('/builder')
  const session = { ...defaultCVState, schemaVersion: '2.0.0' }
  const file = {
    name: 'future-session.pdf', mimeType: 'application/pdf', buffer: await olderCVForgePdf(JSON.stringify(session)),
  }
  const dialog = await openImport(page)
  await importInput(page).setInputFiles(file)
  await expect(dialog.getByRole('alert')).toContainText('session from a newer version of CVForge')
  await expect(dialog.getByRole('button', { name: /Create Editable Draft|Restore Embedded Session/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close import' }).click()

  await page.locator('.app-header').getByRole('link', { name: 'Analyzer', exact: true }).click()
  await page.getByLabel('Choose a PDF for local CV analysis').setInputFiles(file)
  await expect(page.getByRole('alert').filter({ hasText: 'session from a newer version of CVForge' })).toBeVisible()
  await expect(page.getByText('CVForge PDF Extraction Only')).toBeVisible()
  await expect(page.getByRole('button', { name: /Create Editable Draft|Restore Session/ })).toHaveCount(0)
  await expect.poll(() => savedProfileName(page)).toBe('Saved Owner')
})

test('importing an older CVForge PDF removes phantom spaces inside words', async ({ page }) => {
  await page.goto('/builder')
  await importPdf(page, await olderCVForgePdf())

  await expect(page.getByLabel('Full Name')).toHaveValue('Casey Morgan')
  const summary = page.getByLabel('Professional Summary')
  await expect(summary).toHaveValue(/intensive systems programming curriculum at 42 Porto, with hands-on experience building/)
  await expect(page.getByLabel('Role')).toHaveValue('Platform Engineer')
  const work = await page.evaluate(() => JSON.parse(localStorage.getItem('cvforge:state')!).resume.workExperience)
  expect(work).toHaveLength(1)
  expect(work[0]).toMatchObject({ company: 'Acme Corp', startDate: 'Jan 2020', endDate: 'Mar 2023' })
  expect(work[0].bullets).toEqual(['Built a deployment pipeline that reduced release time by 40% for ten teams.'])
})

test('an import opens every section that received content', async ({ page }) => {
  await page.goto('/builder')
  await expect(page.getByLabel('Company', { exact: true })).toHaveCount(0)
  await importPdf(page, await olderCVForgePdf())

  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Acme Corp')
  await expect(page.getByLabel('School / Institution')).toHaveValue('Example University')
  await expect(page.getByLabel('Degree / Major')).toHaveValue('BSc Computer Science')
})

test('an embedded session restored in Analyzer opens Builder sections and preserves the complete CV', async ({ page }) => {
  const original = {
    ...defaultCVState,
    updatedAt: '2024-06-01T12:00:00.000Z',
    resume: {
      ...defaultCVState.resume,
      profile: { ...defaultCVState.resume.profile, name: 'Zoë Brontë' },
      workExperience: [{
        id: 'legacy', company: 'Example Co', role: 'Engineer', location: 'Porto',
        startDate: '2020-01', endDate: '2024-06', isCurrent: false, bullets: ['Built reliable systems'],
        link: { source: 'extension', href: 'https://example.org/work' },
      }],
      customSections: [{ id: 'activities', title: 'Activities', bullets: ['Mentored new developers'] }],
    },
    settings: { ...defaultCVState.settings, themeColor: '#124563' },
  }
  await seedStorage(page, { [CV_STATE_KEY]: JSON.stringify(original) })
  await page.goto('/builder')
  const name = page.getByLabel('Full Name')
  await expect(name).toHaveValue(original.resume.profile.name)
  const pdf = await downloadBuilderPdf(page)
  await name.fill('Replacement Owner')
  await expect.poll(() => savedProfileName(page)).toBe('Replacement Owner')

  const nav = page.locator('.app-header')
  await nav.getByRole('link', { name: 'Analyzer', exact: true }).click()
  const input = page.getByLabel('Choose a PDF for local CV analysis')
  const file = { name: 'cvforge-session.pdf', mimeType: 'application/pdf', buffer: pdf }
  const restore = page.getByRole('button', { name: 'Restore Session' })
  await input.setInputFiles(file)
  await expect(restore).toBeVisible({ timeout: 20_000 })

  await deferImportRead(input, 'replacement.pdf', [...Buffer.from('wrong')], 'signature')
  await expect(page.getByRole('button', { name: 'Choose another PDF' })).toBeVisible()
  await expect(restore).toHaveCount(0)
  await releaseImportRead(page, 'replacement.pdf')
  await expect(page.getByRole('alert').filter({ hasText: 'valid PDF signature' })).toBeVisible()
  await expect.poll(() => savedProfileName(page)).toBe('Replacement Owner')

  await input.setInputFiles(file)
  await expect(restore).toBeVisible({ timeout: 20_000 })
  const acceptDialog = (dialog: Dialog) => dialog.accept()
  page.on('dialog', acceptDialog)
  await restore.click()
  page.off('dialog', acceptDialog)
  await nav.getByRole('link', { name: 'Builder', exact: true }).click()

  await expect(name).toHaveValue(original.resume.profile.name)
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Example Co')
  await expect.poll(async () => JSON.parse((await readStorage(page, CV_STATE_KEY)) ?? 'null')).toEqual(original)

  const companyLink = page.getByLabel('Company Link', { exact: true })
  await expect(companyLink).toHaveValue('')
  await companyLink.fill('example.org/careers')
  await expect.poll(async () => JSON.parse((await readStorage(page, CV_STATE_KEY)) ?? 'null').resume.workExperience[0])
    .toEqual({ ...original.resume.workExperience[0], companyLink: 'example.org/careers' })
})

test('section move arrows sit side by side in one row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/builder')
  const up = page.getByRole('button', { name: 'Move section up' }).nth(1)
  const down = page.getByRole('button', { name: 'Move section down' }).nth(1)
  const upBox = (await up.boundingBox())!
  const downBox = (await down.boundingBox())!
  expect(Math.abs(upBox.y - downBox.y)).toBeLessThanOrEqual(1)
  expect(downBox.x).toBeGreaterThanOrEqual(upBox.x + upBox.width - 1)
  expect(Math.min(upBox.width, upBox.height)).toBeGreaterThanOrEqual(24)
})
