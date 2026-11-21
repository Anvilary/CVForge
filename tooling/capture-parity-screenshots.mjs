import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 430, height: 932, name: '430x932' },
  { width: 390, height: 844, name: '390x844' },
  { width: 320, height: 700, name: '320x700' },
]

const OUT_DIR = path.resolve('docs/media/parity')

async function createSideBySide(img1Buffer, img2Buffer, label1, label2, outputPath) {
  const meta1 = await sharp(img1Buffer).metadata()
  const meta2 = await sharp(img2Buffer).metadata()

  const targetWidth = Math.max(meta1.width ?? 0, meta2.width ?? 0)
  const headerBarHeight = 32

  // Resize both to same width if needed or center them
  const resized1 = await sharp(img1Buffer)
    .resize({ width: targetWidth, fit: 'contain', background: { r: 14, g: 14, b: 16, alpha: 1 } })
    .toBuffer()
  const resized2 = await sharp(img2Buffer)
    .resize({ width: targetWidth, fit: 'contain', background: { r: 14, g: 14, b: 16, alpha: 1 } })
    .toBuffer()

  const rMeta1 = await sharp(resized1).metadata()
  const rMeta2 = await sharp(resized2).metadata()

  const totalHeight = headerBarHeight * 2 + (rMeta1.height ?? 0) + (rMeta2.height ?? 0) + 16

  const svgBanner1 = Buffer.from(`
    <svg width="${targetWidth}" height="${headerBarHeight}">
      <rect width="100%" height="100%" fill="#16161a"/>
      <text x="16" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#d97442">${label1}</text>
    </svg>
  `)
  const svgBanner2 = Buffer.from(`
    <svg width="${targetWidth}" height="${headerBarHeight}">
      <rect width="100%" height="100%" fill="#16161a"/>
      <text x="16" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#ec8a4a">${label2}</text>
    </svg>
  `)

  const canvas = sharp({
    create: {
      width: targetWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 14, g: 14, b: 16, alpha: 1 },
    },
  })

  const y1 = headerBarHeight
  const y2 = y1 + (rMeta1.height ?? 0) + 8
  const y3 = y2 + headerBarHeight

  await canvas
    .composite([
      { input: svgBanner1, top: 0, left: 0 },
      { input: resized1, top: y1, left: 0 },
      { input: svgBanner2, top: y2, left: 0 },
      { input: resized2, top: y3, left: 0 },
    ])
    .png()
    .toFile(outputPath)
}

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    args: ['--no-sandbox'],
  })

  const metricsReport = []

  for (const vp of VIEWPORTS) {
    console.log(`Capturing viewport: ${vp.name}...`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })

    const pageAnvilary = await context.newPage()
    await pageAnvilary.goto('https://anvilary.tools', { waitUntil: 'networkidle' })
    await pageAnvilary.waitForTimeout(500)

    const pageCVForge = await context.newPage()
    await pageCVForge.goto('http://127.0.0.1:3030', { waitUntil: 'networkidle' })
    await pageCVForge.waitForTimeout(500)

    // Header captures
    const headerAnvilary = pageAnvilary.locator('.site-header')
    const headerCVForge = pageCVForge.locator('.site-header')

    const headerBufAnvilary = await headerAnvilary.screenshot()
    const headerBufCVForge = await headerCVForge.screenshot()

    await fs.writeFile(path.join(OUT_DIR, `anvilary-header-${vp.name}.png`), headerBufAnvilary)
    await fs.writeFile(path.join(OUT_DIR, `cvforge-header-${vp.name}.png`), headerBufCVForge)

    await createSideBySide(
      headerBufAnvilary,
      headerBufCVForge,
      `Anvilary Main Website Header (${vp.name})`,
      `CVForge Synchronized Header (${vp.name})`,
      path.join(OUT_DIR, `header-comparison-${vp.name}.png`)
    )

    // Footer captures
    const footerAnvilary = pageAnvilary.locator('.site-footer')
    const footerCVForge = pageCVForge.locator('.site-footer')

    const footerBufAnvilary = await footerAnvilary.screenshot()
    const footerBufCVForge = await footerCVForge.screenshot()

    await fs.writeFile(path.join(OUT_DIR, `anvilary-footer-${vp.name}.png`), footerBufAnvilary)
    await fs.writeFile(path.join(OUT_DIR, `cvforge-footer-${vp.name}.png`), footerBufCVForge)

    await createSideBySide(
      footerBufAnvilary,
      footerBufCVForge,
      `Anvilary Main Website Footer (${vp.name})`,
      `CVForge Synchronized Footer (${vp.name})`,
      path.join(OUT_DIR, `footer-comparison-${vp.name}.png`)
    )

    // Compute metrics
    const headerMetrics = await pageCVForge.evaluate(() => {
      const h = document.querySelector('.site-header')
      const inner = document.querySelector('.site-header-inner')
      const brandLogo = document.querySelector('.site-header .brand-logo img')
      const brandText = document.querySelector('.site-header .brand .brand-text')
      const navLink = document.querySelector('.site-header nav a')
      const hRect = h?.getBoundingClientRect()
      const iRect = inner?.getBoundingClientRect()
      const logoRect = brandLogo?.getBoundingClientRect()
      const hStyle = h ? getComputedStyle(h) : null
      const textStyle = brandText ? getComputedStyle(brandText) : null
      const linkStyle = navLink ? getComputedStyle(navLink) : null
      return {
        headerHeight: hRect?.height,
        innerWidth: iRect?.width,
        logoWidth: logoRect?.width,
        logoHeight: logoRect?.height,
        brandFontSize: textStyle?.fontSize,
        navFontSize: linkStyle?.fontSize,
        bg: hStyle?.backgroundColor,
        backdropBlur: hStyle?.backdropFilter,
      }
    })

    const footerMetrics = await pageCVForge.evaluate(() => {
      const f = document.querySelector('.site-footer')
      const fRect = f?.getBoundingClientRect()
      const fStyle = f ? getComputedStyle(f) : null
      return {
        footerHeight: fRect?.height,
        fontSize: fStyle?.fontSize,
        color: fStyle?.color,
        bg: fStyle?.backgroundColor,
      }
    })

    metricsReport.push({
      viewport: vp.name,
      header: headerMetrics,
      footer: footerMetrics,
    })

    await context.close()
  }

  // Builder and Analyzer workbench captures
  for (const vp of [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 390, height: 844, name: '390x844' },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })

    const pageBuilder = await context.newPage()
    await pageBuilder.goto('http://127.0.0.1:3030/builder', { waitUntil: 'networkidle' })
    await pageBuilder.waitForTimeout(1000)
    const builderBuf = await pageBuilder.screenshot()
    await fs.writeFile(path.join(OUT_DIR, `cvforge-builder-${vp.name}.png`), builderBuf)

    const pageAnalyzer = await context.newPage()
    await pageAnalyzer.goto('http://127.0.0.1:3030/analyzer', { waitUntil: 'networkidle' })
    await pageAnalyzer.waitForTimeout(500)
    const analyzerBuf = await pageAnalyzer.screenshot()
    await fs.writeFile(path.join(OUT_DIR, `cvforge-analyzer-${vp.name}.png`), analyzerBuf)

    await context.close()
  }

  await browser.close()

  await fs.writeFile(
    path.join(OUT_DIR, 'metrics.json'),
    JSON.stringify(metricsReport, null, 2),
    'utf-8'
  )

  console.log('Capture complete! Metrics saved to docs/media/parity/metrics.json')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
