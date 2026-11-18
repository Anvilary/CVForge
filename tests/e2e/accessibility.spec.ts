import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'

async function expectNoSeriousViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  const violations = result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
  expect(violations).toEqual([])
}

test('homepage and Builder entry dialog have no serious or critical axe violations', async ({ page }) => {
  await page.goto('/')
  await expectNoSeriousViolations(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await expectNoSeriousViolations(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.locator('.hero').getByRole('button', { name: 'Build your CV' }).click()
  const dialog = page.getByRole('dialog', { name: 'Start with CVForge' })
  await expect(dialog).toBeVisible()
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  )
  await expectNoSeriousViolations(page)
})

async function addBuilderItem(page: Page, title: string, action: string) {
  const card = page.locator('.group').filter({ has: page.getByText(title, { exact: true }) })
  await card.getByRole('button', { name: 'Expand section' }).press('Enter')
  await card.getByRole('button', { name: action, exact: true }).press('Enter')
}

test('expanded Builder forms have accessible labels and no serious or critical axe violations', async ({ page }) => {
  await page.goto('/builder')
  await page.getByLabel('Full Name').fill('Zoë Brontë-Smith')
  await page.getByLabel('Professional Summary').fill('Product engineer focused on accessible and reliable experiences.')

  await addBuilderItem(page, 'Work Experience', 'Add Experience')
  const current = page.getByRole('checkbox', { name: 'Currently Work Here' })
  const endDate = page.getByRole('textbox', { name: 'End Date', exact: true })
  const description = page.getByRole('textbox', { name: 'Description', exact: true })
  await expect(endDate).toHaveAccessibleName('End Date')
  await expect(description).toHaveAccessibleName('Description')

  await current.focus()
  await page.keyboard.press('Space')
  await expect(current).toBeChecked()
  await expect(endDate).toHaveValue('Present')
  await page.keyboard.press('Tab')
  await expect(endDate).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Switch to paragraph mode' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Switch to bullet mode' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(description).toBeFocused()

  await addBuilderItem(page, 'Education', 'Add Education')
  await expect(page.getByRole('textbox', { name: 'School / Institution' })).toBeVisible()
  await addBuilderItem(page, 'Projects', 'Add Project')
  await expect(page.getByRole('textbox', { name: 'Project Name' })).toBeVisible()
  await page.getByRole('button', { name: /Add Custom Section/ }).click()
  await expect(description).toHaveCount(4)
  await expect(endDate).toHaveCount(3)
  await expectNoSeriousViolations(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.workbench-mobile-nav').getByRole('button').first()).toBeVisible()
  await expect(description).toHaveCount(4)
  await expect(endDate).toHaveCount(3)
  await expect(current).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('Analyzer empty and result states have no serious or critical axe violations', async ({ page }) => {
  await page.goto('/analyzer')
  await expectNoSeriousViolations(page)

  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)
  const pdfPage = document.addPage([595, 842])
  pdfPage.drawText('Alex Morgan', { x: 48, y: 790, size: 20, font })
  pdfPage.drawText('EXPERIENCE', { x: 48, y: 740, size: 13, font })
  pdfPage.drawText('Reduced errors by 32% for 12000 users.', { x: 48, y: 710, size: 11, font })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'accessible-result.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await document.save()),
  })
  await expect(page.getByText('accessible-result.pdf')).toBeVisible({ timeout: 20_000 })
  await expectNoSeriousViolations(page)
})

test('Import review dialog has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/builder')
  await page.getByRole('button', { name: 'Import' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CV Data' })
  await expect(dialog).toBeVisible()
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  )
  await expectNoSeriousViolations(page)
})
