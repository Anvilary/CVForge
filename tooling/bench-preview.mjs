#!/usr/bin/env node
// Reproducible Builder preview benchmark (Chromium, Playwright).
//
//   node tooling/bench-preview.mjs --url http://127.0.0.1:3030 --label after --out docs/performance/preview-after.json
//
// Drives the real Builder with isolated synthetic CVs seeded into a throwaway
// browser profile. It never touches a user's browser storage. Stage timings
// come from `pv:*` performance measures the app records on the main thread;
// everything else (visible latency, long tasks, canvases, workers, heap) is
// observed from outside, so the same harness can run against any revision.
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[index + 1]])
  return pairs
}, []))
const URL_BASE = args.url ?? 'http://127.0.0.1:3030'
const LABEL = args.label ?? 'run'
const OUT = args.out
const RUNS = Number(args.runs ?? 7)
const SIZES = (args.pages ?? '1,2,5,10').split(',').map(Number)
// --pin <previous-output.json> reuses that run's fixtures so two runs measure identical CVs.
const PIN = args.pin ? JSON.parse(await readFile(args.pin, 'utf8')) : null
const ONLY = args.only ? args.only.split(',') : null
const CV_STATE_KEY = 'cvforge:state'

function workItem(index) {
  return {
    id: `work-${index}`,
    company: `Example Organization ${index}`,
    role: 'Senior Software Engineer',
    location: 'London, United Kingdom',
    startDate: '2019-01',
    endDate: '2023-06',
    isCurrent: false,
    bullets: [
      'Led the migration of critical services with zero data loss and improved reliability by 35%.',
      'Designed continuous integration pipelines that cut delivery time from hours to minutes.',
      'Mentored a team of five and documented accessible review practices for the whole organization.',
      'Coordinated platform observability with actionable alerts and shared dashboards.',
    ],
  }
}

function payload(workCount) {
  return JSON.stringify({
    schemaVersion: '1.0.0',
    updatedAt: '2026-09-26T00:00:00.000Z',
    resume: {
      profile: {
        name: 'Zoe Bronte-Smith',
        email: 'zoe@example.org',
        phone: '+44 20 7946 0000',
        location: 'London',
        website: '',
        summary: 'Engineer focused on reliable, accessible, and measurable systems.',
      },
      workExperience: Array.from({ length: workCount }, (_, index) => workItem(index + 1)),
      skills: { technical: ['TypeScript', 'React', 'PostgreSQL'], soft: ['Communication'] },
    },
    settings: { documentSize: 'A4', visibleSections: {}, bulletVisibility: {} },
  })
}

// Runs in the page before any app script.
function installProbes() {
  const bench = { canvases: 0, offscreen: 0, workersCreated: 0, workersTerminated: 0, refs: [], live: new Set(), longTasks: [], inputs: [], frames: null }
  window.__bench = bench
  const createElement = Document.prototype.createElement
  Document.prototype.createElement = function (tag, ...rest) {
    const el = createElement.call(this, tag, ...rest)
    if (String(tag).toLowerCase() === 'canvas') { bench.canvases += 1; bench.refs.push(new WeakRef(el)) }
    return el
  }
  const NativeOffscreen = window.OffscreenCanvas
  if (NativeOffscreen) {
    window.OffscreenCanvas = class extends NativeOffscreen {
      constructor(...a) { super(...a); bench.offscreen += 1; bench.refs.push(new WeakRef(this)) }
    }
  }
  const NativeWorker = window.Worker
  window.Worker = class extends NativeWorker {
    constructor(...a) { super(...a); bench.workersCreated += 1; bench.live.add(this) }
    terminate() { if (bench.live.delete(this)) bench.workersTerminated += 1; super.terminate() }
  }
  new PerformanceObserver((list) => list.getEntries().forEach((e) => bench.longTasks.push(e.duration)))
    .observe({ type: 'longtask', buffered: false })

  // Input-to-state: a bubbling window listener runs after React's root
  // listener, by which point a discrete update has been flushed. Input-to-paint
  // is the next message task after a requestAnimationFrame.
  for (const type of ['click', 'input', 'keydown']) {
    window.addEventListener(type, (event) => { bench.lastEventAt = event.timeStamp }, { capture: true })
  }
  const channel = new MessageChannel()
  window.addEventListener('input', (event) => {
    const committed = performance.now() - event.timeStamp
    requestAnimationFrame(() => {
      channel.port2.onmessage = () => bench.inputs.push({ toState: committed, toPaint: performance.now() - event.timeStamp })
      channel.port1.postMessage(0)
    })
  })

  const scratch = document.createElement('canvas')
  scratch.width = 240
  scratch.height = 340
  const sctx = scratch.getContext('2d', { willReadFrequently: true })
  sctx.imageSmoothingQuality = 'high'
  const hashPixels = (data) => {
    let hash = 2166136261
    for (let i = 0; i < data.length; i += 4) hash = Math.imul(hash ^ (data[i] + (data[i + 1] << 8) + (data[i + 2] << 16)), 16777619)
    return hash >>> 0
  }
  bench.sig = () => {
    const canvases = Array.from(document.querySelectorAll('.canvas canvas')).filter((c) => c.getBoundingClientRect().width > 0)
    const first = canvases[0]
    if (!first || first.width === 0) return { sig: '', pages: canvases.length, blank: true, width: 0, bitmap: 0 }
    sctx.clearRect(0, 0, 240, 340)
    sctx.drawImage(first, 0, 0, 240, 340)
    const pixel = first.getContext('2d', { willReadFrequently: true })
    const corner = pixel ? pixel.getImageData(Math.floor(first.width / 2), 2, 1, 1).data[3] : 0
    return {
      sig: String(hashPixels(sctx.getImageData(0, 0, 240, 340).data)),
      pages: canvases.length,
      blank: corner === 0,
      width: Math.round(first.getBoundingClientRect().width * 10) / 10,
      bitmap: first.width,
    }
  }
  bench.fullSig = () => {
    const canvases = Array.from(document.querySelectorAll('.canvas canvas'))
    return canvases.map((c) => {
      const ctx = c.getContext('2d', { willReadFrequently: true })
      return `${c.width}x${c.height}:${hashPixels(ctx.getImageData(0, 0, c.width, c.height).data)}`
    }).join('|')
  }
  bench.startFrames = () => {
    const state = { rows: [], running: true, last: '', frames: 0, maxGap: 0, lastT: performance.now() }
    bench.frames = state
    const tick = (now) => {
      if (!state.running) return
      state.frames += 1
      state.maxGap = Math.max(state.maxGap, now - state.lastT)
      state.lastT = now
      const s = bench.sig()
      const loader = Array.from(document.querySelectorAll('.canvas [role="status"]'))
        .some((n) => /Preparing document|Rendering page|Rendering pages/.test(n.textContent ?? ''))
      const key = `${s.sig}|${s.pages}|${s.blank}|${s.width}|${s.bitmap}|${loader}`
      if (key !== state.last) { state.rows.push({ t: performance.now(), ...s, loader }); state.last = key }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  bench.stopFrames = () => { bench.frames.running = false; return bench.frames }
}

// Resident memory of the whole browser process tree, which includes canvas
// backing stores and workers that the JS heap counters do not see.
const BENCH_TAG = `cvforge-bench-${randomUUID()}`

function readProc(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    const afterName = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    const status = readFileSync(`/proc/${pid}/status`, 'utf8')
    const rss = Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] ?? 0)
    return { pid, ppid: Number(afterName[1]), rssKiB: rss, cmd: readFileSync(`/proc/${pid}/cmdline`, 'utf8') }
  } catch {
    return null
  }
}

function browserRssMiB() {
  const all = readdirSync('/proc').filter((name) => /^\d+$/.test(name)).map((name) => readProc(Number(name))).filter(Boolean)
  const roots = all.filter((proc) => proc.cmd.includes(BENCH_TAG) && !proc.cmd.includes('--type='))
  const included = new Set(roots.map((proc) => proc.pid))
  let grew = true
  while (grew) {
    grew = false
    for (const proc of all) {
      if (!included.has(proc.pid) && included.has(proc.ppid)) { included.add(proc.pid); grew = true }
    }
  }
  const total = all.filter((proc) => included.has(proc.pid)).reduce((sum, proc) => sum + proc.rssKiB, 0)
  return Math.round((total / 1024) * 10) / 10
}

function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return Math.round(sorted[Math.max(0, index)] * 10) / 10
}

const summarize = (values) => ({ n: values.length, p50: percentile(values, 50), p95: percentile(values, 95), max: percentile(values, 100) })

async function openBuilder(context, workCount, options = {}) {
  const page = await context.newPage()
  await page.addInitScript(installProbes)
  if (options.measure) {
    await page.addInitScript(() => {
      const poll = () => {
        if (document.querySelector('.canvas canvas') && window.__bench?.sig().sig) window.__firstPreviewAt = performance.now()
        else requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    })
  }
  await page.goto(`${URL_BASE}/robots.txt`)
  await page.evaluate(([key, value]) => { localStorage.clear(); localStorage.setItem(key, value) }, [CV_STATE_KEY, payload(workCount)])
  await page.goto(`${URL_BASE}/builder`)
  await page.waitForFunction(() => document.querySelector('.canvas canvas') && window.__bench.sig().sig !== '', null, { timeout: 60_000 })
  if (options.measure) await page.waitForFunction(() => window.__firstPreviewAt !== undefined)
  return page
}

async function pageCountFor(context, workCount) {
  const page = await openBuilder(context, workCount)
  await page.waitForTimeout(500)
  const got = await page.locator('.canvas canvas').count()
  await page.close()
  return got
}

// Returns the work-item count and the page count it actually produced.
async function calibrate(context, pages) {
  const pinned = PIN?.sizes?.[pages]?.workCount
  if (pinned) return { workCount: pinned, achievedPages: await pageCountFor(context, pinned) }
  let count = pages * 5
  let got = 0
  for (let attempt = 0; attempt < 8; attempt += 1) {
    got = await pageCountFor(context, count)
    if (got === pages) break
    count = Math.max(1, Math.round(count * (pages / got)) + (got < pages ? 1 : -1) * (attempt > 2 ? 1 : 0))
  }
  return { workCount: count, achievedPages: got }
}

// Large documents can block the page for hundreds of milliseconds between two
// visible changes, so the quiet period that counts as settled grows with size.
let quietMs = 700

async function settle(page) {
  let previous = ''
  let stableSince = Date.now()
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const sig = await page.evaluate(() => window.__bench.sig().sig)
    if (sig !== previous) { previous = sig; stableSince = Date.now() }
    if (Date.now() - stableSince > quietMs) return
    await page.waitForTimeout(60)
  }
  throw new Error('preview did not settle')
}

async function beginWindow(page) {
  await page.evaluate(() => {
    const b = window.__bench
    performance.clearMeasures()
    b.longTasks.length = 0
    b.inputs.length = 0
    b.window = { canvases: b.canvases, offscreen: b.offscreen, workers: b.workersCreated }
    b.startFrames()
  })
}

async function endWindow(page, markT) {
  return page.evaluate((mark) => {
    const b = window.__bench
    const frames = b.stopFrames()
    const measures = {}
    for (const m of performance.getEntriesByType('measure').filter((e) => e.name.startsWith('pv:'))) {
      ;(measures[m.name] ??= []).push(m.duration)
    }
    const final = frames.rows[frames.rows.length - 1]
    // Latency is counted from the last real user event when there is one.
    const origin = b.lastEventAt && b.lastEventAt >= mark - 1 ? b.lastEventAt : mark
    const at = frames.rows.find((r) => r.t >= origin && r.sig === final.sig)
    const base = [...frames.rows].reverse().find((r) => r.t < origin) ?? frames.rows[0]
    const widthChange = frames.rows.find((r) => r.t >= origin && r.width !== base.width)
    const bitmapChange = frames.rows.find((r) => r.t >= origin && r.bitmap !== base.bitmap)
    return {
      layoutChangeMs: widthChange ? widthChange.t - origin : null,
      bitmapChangeMs: bitmapChange ? bitmapChange.t - origin : null,
      visibleMs: at ? Math.max(0, at.t - origin) : null,
      distinctUpdates: frames.rows.filter((r) => r.t >= origin).length,
      blankFrames: frames.rows.filter((r) => r.pages > 0 && r.blank).length,
      noPageFrames: frames.rows.filter((r) => r.pages === 0).length,
      loaderFrames: frames.rows.filter((r) => r.loader).length,
      maxFrameGapMs: Math.round(frames.maxGap),
      frames: frames.frames,
      longTasks: { count: b.longTasks.length, totalMs: Math.round(b.longTasks.reduce((a, c) => a + c, 0)), maxMs: Math.round(Math.max(0, ...b.longTasks)) },
      measures: Object.fromEntries(Object.entries(measures).map(([k, v]) => [k, { count: v.length, sumMs: Math.round(v.reduce((a, c) => a + c, 0) * 10) / 10 }])),
      inputs: b.inputs.slice(),
      canvasesCreated: b.canvases - b.window.canvases + (b.offscreen - b.window.offscreen),
      workersCreated: b.workersCreated - b.window.workers,
      finalSig: final.sig,
    }
  }, markT)
}

const nowIn = (page) => page.evaluate(() => performance.now())

const editors = {
  summary: (page) => page.getByLabel('Professional Summary'),
}

async function openSettings(page) {
  const heading = page.getByRole('heading', { name: 'Builder Settings' })
  await heading.scrollIntoViewIfNeeded()
  await heading.locator('xpath=ancestor::*[.//button[@aria-label="Expand section"]][1]').getByRole('button', { name: 'Expand section' }).click()
}

const scenarios = {
  'typing-normal': async (page, run) => {
    const el = editors.summary(page)
    await el.click(); await el.press('End')
    await beginWindow(page)
    await el.pressSequentially(` Run ${run} typed update.`, { delay: 60 })
    return nowIn(page)
  },
  'typing-rapid': async (page, run) => {
    const el = editors.summary(page)
    await el.click(); await el.press('End')
    await beginWindow(page)
    await el.pressSequentially(` Rapid ${run} burst of text typed quickly into the summary.`, { delay: 8 })
    return nowIn(page)
  },
  'paste-paragraph': async (page, run) => {
    const el = editors.summary(page)
    await el.click()
    await beginWindow(page)
    const text = `Pasted ${run}. ` + 'Experienced engineer delivering reliable, accessible products with measurable outcomes across teams. '.repeat(5)
    const mark = await nowIn(page)
    await el.fill(text)
    return mark
  },
  'delete-content': async (page, run) => {
    const el = editors.summary(page)
    await el.fill(`Deletion ${run}. ` + 'Experienced engineer delivering reliable products with measurable outcomes. '.repeat(3))
    await settle(page)
    await el.click(); await el.press('End')
    await beginWindow(page)
    for (let i = 0; i < 25; i += 1) await el.press('Backspace', { delay: 0 })
    return nowIn(page)
  },
  'change-typography': async (page, run) => {
    await beginWindow(page)
    const mark = await nowIn(page)
    await page.getByRole('button', { name: run % 2 ? 'Helvetica (Sans)' : 'Times (Serif)' }).click()
    return mark
  },
  'change-spacing': async (page, run) => {
    await beginWindow(page)
    const mark = await nowIn(page)
    await page.getByLabel('Section Spacing').fill(String(10 + (run % 2) * 25))
    return mark
  },
  'toggle-visibility': async (page, run) => {
    const work = page.getByRole('heading', { name: 'Work Experience' }).locator('xpath=ancestor::*[.//button[contains(@aria-label,"section from PDF")]][1]')
    await beginWindow(page)
    const mark = await nowIn(page)
    await work.getByRole('button', { name: run % 2 ? 'Hide section from PDF' : 'Show section in PDF' }).first().click()
    return mark
  },
  'reorder-sections': async (page, run) => {
    const work = page.getByRole('heading', { name: 'Work Experience' }).locator('xpath=ancestor::*[.//button[@aria-label="Move section down"]][1]')
    await beginWindow(page)
    const mark = await nowIn(page)
    await work.getByRole('button', { name: run % 2 ? 'Move section down' : 'Move section up' }).first().click()
    return mark
  },
  'zoom': async (page, run) => {
    const toolbar = page.getByRole('toolbar', { name: 'PDF preview controls' })
    await beginWindow(page)
    const mark = await nowIn(page)
    await toolbar.getByRole('button', { name: run % 2 ? 'Zoom out PDF preview' : 'Zoom in PDF preview' }).click()
    return mark
  },
  'panel-resize': async (page, run) => {
    await beginWindow(page)
    const mark = await nowIn(page)
    await page.setViewportSize({ width: run % 2 ? 1440 : 1180, height: 900 })
    return mark
  },
}

const SETTLE_AFTER = new Set(Object.keys(scenarios))

async function runScenario(context, name, workCount) {
  const page = await openBuilder(context, workCount)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByLabel('Professional Summary').waitFor()
  if (name === 'change-typography' || name === 'change-spacing') await openSettings(page)
  await settle(page)
  const client = await context.newCDPSession(page)
  await client.send('Performance.enable')
  const heap = async (gc) => {
    if (gc) await client.send('HeapProfiler.collectGarbage')
    const { metrics } = await client.send('Performance.getMetrics')
    return metrics.find((m) => m.name === 'JSHeapUsedSize').value / (1024 * 1024)
  }
  const heapBefore = await heap(true)
  const rssBefore = browserRssMiB()
  let rssPeak = rssBefore
  const sampler = setInterval(() => { rssPeak = Math.max(rssPeak, browserRssMiB()) }, 150)
  const runs = []
  for (let run = 1; run <= RUNS; run += 1) {
    const mark = await scenarios[name](page, run)
    if (SETTLE_AFTER.has(name)) await settle(page)
    const result = await endWindow(page, mark)
    result.fullSig = await page.evaluate(() => window.__bench.fullSig())
    runs.push(result)
  }
  clearInterval(sampler)
  const heapAfter = await heap(true)
  const rssAfter = browserRssMiB()
  const resources = await page.evaluate(() => ({
    liveCanvasObjects: window.__bench.refs.filter((r) => r.deref()).length,
    attachedCanvases: document.querySelectorAll('canvas').length,
    liveWorkersTracked: window.__bench.live.size,
    totalCanvasesCreated: window.__bench.canvases,
    totalOffscreenCreated: window.__bench.offscreen,
    totalWorkersCreated: window.__bench.workersCreated,
  }))
  const result = { rssBeforeMiB: rssBefore, rssPeakMiB: rssPeak, rssAfterMiB: rssAfter, heapBeforeMiB: Math.round(heapBefore * 10) / 10, heapAfterMiB: Math.round(heapAfter * 10) / 10, dedicatedWorkers: page.workers().length, ...resources, runs }
  await page.close()
  return result
}

// Cold start: a fresh browser context (empty cache) per run, measured from the
// start of the Builder navigation until the first page is painted.
async function measureFirstPreview(browser, workCount) {
  const times = []
  for (let run = 0; run < Math.min(RUNS, 5); run += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const page = await openBuilder(context, workCount, { measure: true })
    times.push(await page.evaluate(() => window.__firstPreviewAt))
    await context.close()
  }
  return summarize(times)
}

function aggregate(runs) {
  const stage = (name) => runs.flatMap((r) => (r.measures[name] ? [r.measures[name].sumMs / Math.max(1, r.measures[name].count)] : []))
  const keystrokes = runs.flatMap((r) => r.inputs)
  return {
    visibleMs: summarize(runs.flatMap((r) => (r.visibleMs === null ? [] : [r.visibleMs]))),
    layoutChangeMs: summarize(runs.flatMap((r) => (r.layoutChangeMs === null ? [] : [r.layoutChangeMs]))),
    bitmapChangeMs: summarize(runs.flatMap((r) => (r.bitmapChangeMs === null ? [] : [r.bitmapChangeMs]))),
    inputToStateMs: summarize(keystrokes.map((k) => k.toState)),
    inputToPaintMs: summarize(keystrokes.map((k) => k.toPaint)),
    scheduleMs: summarize(stage('pv:schedule')),
    generateMs: summarize(stage('pv:generate')),
    loadMs: summarize(stage('pv:load')),
    rasterMs: summarize(stage('pv:raster')),
    generationsPerRun: summarize(runs.map((r) => r.measures['pv:generate']?.count ?? 0)),
    longTaskTotalMs: summarize(runs.map((r) => r.longTasks.totalMs)),
    longTaskMaxMs: summarize(runs.map((r) => r.longTasks.maxMs)),
    maxFrameGapMs: summarize(runs.map((r) => r.maxFrameGapMs)),
    blankFrames: runs.reduce((a, r) => a + r.blankFrames, 0),
    noPageFrames: runs.reduce((a, r) => a + r.noPageFrames, 0),
    loaderFrames: runs.reduce((a, r) => a + r.loaderFrames, 0),
    distinctUpdatesPerRun: summarize(runs.map((r) => r.distinctUpdates)),
    canvasesCreatedPerRun: summarize(runs.map((r) => r.canvasesCreated)),
    workersCreated: runs.reduce((a, r) => a + r.workersCreated, 0),
  }
}

const browser = await chromium.launch({ args: ['--enable-precise-memory-info', `--cvforge-bench-tag=${BENCH_TAG}`] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const output = { label: LABEL, url: URL_BASE, date: new Date().toISOString(), browser: browser.version(), runsPerScenario: RUNS, sizes: {} }
for (const pages of SIZES) {
  quietMs = 700 + 150 * pages
  const { workCount, achievedPages } = await calibrate(context, pages)
  console.log(`[bench] ${pages}-page fixture: ${workCount} work items, ${achievedPages} pages produced`)
  output.sizes[pages] = { workCount, achievedPages, firstPreviewMs: await measureFirstPreview(browser, workCount), scenarios: {} }
  console.log(`[bench] ${pages}p cold first preview: p50=${output.sizes[pages].firstPreviewMs.p50} ms`)
  for (const name of Object.keys(scenarios)) {
    if (ONLY && !ONLY.includes(name)) continue
    try {
      const detail = await runScenario(context, name, workCount)
      const summary = aggregate(detail.runs)
      output.sizes[pages].scenarios[name] = { summary, resources: { rssBeforeMiB: detail.rssBeforeMiB, rssPeakMiB: detail.rssPeakMiB, rssAfterMiB: detail.rssAfterMiB, heapBeforeMiB: detail.heapBeforeMiB, heapAfterMiB: detail.heapAfterMiB, dedicatedWorkers: detail.dedicatedWorkers, liveCanvasObjects: detail.liveCanvasObjects, attachedCanvases: detail.attachedCanvases, liveWorkersTracked: detail.liveWorkersTracked, totalCanvasesCreated: detail.totalCanvasesCreated, totalOffscreenCreated: detail.totalOffscreenCreated, totalWorkersCreated: detail.totalWorkersCreated }, runs: detail.runs.map(({ inputs: _inputs, ...rest }) => rest) }
      console.log(`[bench] ${pages}p ${name}: visible p50=${summary.visibleMs.p50} p95=${summary.visibleMs.p95} ms, blank=${summary.blankFrames}, longtask max=${summary.longTaskMaxMs.p95}`)
    } catch (error) {
      output.sizes[pages].scenarios[name] = { error: String(error) }
      console.log(`[bench] ${pages}p ${name}: FAILED ${error}`)
    }
  }
}
await browser.close()
if (OUT) await writeFile(OUT, JSON.stringify(output, null, 2))
else console.log(JSON.stringify(output, null, 2))
