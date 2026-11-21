#!/usr/bin/env node
// Prints a Markdown comparison of two tooling/bench-preview.mjs outputs.
//
//   node tooling/compare-preview-bench.mjs docs/performance/preview-baseline.json docs/performance/preview-after.json
import { readFile } from 'node:fs/promises'

const [beforePath, afterPath] = process.argv.slice(2)
if (!beforePath || !afterPath) {
  console.error('Usage: compare-preview-bench.mjs <before.json> <after.json>')
  process.exit(2)
}
const before = JSON.parse(await readFile(beforePath, 'utf8'))
const after = JSON.parse(await readFile(afterPath, 'utf8'))

const fmt = (value) => (value === null || value === undefined ? 'n/a' : String(value))
const change = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return 'n/a'
  if (a === 0 && b === 0) return 'same'
  if (a === 0) return `+${b}`
  const pct = Math.round(((a - b) / a) * 100)
  return pct >= 0 ? `-${pct}%` : `+${-pct}%`
}

function row(label, a, b) {
  return `| ${label} | ${fmt(a)} | ${fmt(b)} | ${change(a, b)} |`
}

function metric(side, size, scenario, key, stat) {
  return side.sizes[size]?.scenarios?.[scenario]?.summary?.[key]?.[stat] ?? null
}

function table(title, size, scenario, keys) {
  const lines = [`#### ${title}`, '', '| Metric | Before | After | Change |', '|---|---|---|---|']
  for (const [label, key, stat] of keys) lines.push(row(label, metric(before, size, scenario, key, stat), metric(after, size, scenario, key, stat)))
  return lines.join('\n')
}

const editKeys = [
  ['Last input to latest content visible, p50 (ms)', 'visibleMs', 'p50'],
  ['Last input to latest content visible, p95 (ms)', 'visibleMs', 'p95'],
  ['Scheduling delay, p50 (ms)', 'scheduleMs', 'p50'],
  ['PDF generation (round trip on main thread), p50 (ms)', 'generateMs', 'p50'],
  ['PDF.js document load, p50 (ms)', 'loadMs', 'p50'],
  ['Page rasterization, p50 (ms)', 'rasterMs', 'p50'],
  ['Longest main-thread task, p95 (ms)', 'longTaskMaxMs', 'p95'],
  ['Main-thread long-task time per run, p50 (ms)', 'longTaskTotalMs', 'p50'],
  ['Input to state commit, p95 (ms)', 'inputToStateMs', 'p95'],
  ['Input to next paint, p95 (ms)', 'inputToPaintMs', 'p95'],
  ['Canvases created per run, p50', 'canvasesCreatedPerRun', 'p50'],
  ['Blank frames (total)', 'blankFrames', null],
]

function plain(side, size, scenario, key) {
  return side.sizes[size]?.scenarios?.[scenario]?.summary?.[key] ?? null
}

const out = [`# Preview benchmark: ${before.label} vs ${after.label}`, '', `Before: ${before.url}, ${before.date}, ${before.browser}`, `After: ${after.url}, ${after.date}, ${after.browser}`, '']
for (const size of Object.keys(after.sizes)) {
  out.push(`## ${size}-page document (${after.sizes[size].workCount} work items)`, '')
  const fp = [before.sizes[size]?.firstPreviewMs?.p50 ?? null, after.sizes[size]?.firstPreviewMs?.p50 ?? null]
  if (fp[1] !== null) out.push(row('Cold first preview, p50 (ms)', fp[0], fp[1]), '')
  for (const scenario of ['typing-normal', 'typing-rapid', 'paste-paragraph', 'delete-content', 'change-typography', 'change-spacing', 'toggle-visibility', 'reorder-sections']) {
    const lines = [`#### ${scenario}`, '', '| Metric | Before | After | Change |', '|---|---|---|---|']
    for (const [label, key, stat] of editKeys) {
      if (stat === null) lines.push(row(label, plain(before, size, scenario, key), plain(after, size, scenario, key)))
      else lines.push(row(label, metric(before, size, scenario, key, stat), metric(after, size, scenario, key, stat)))
    }
    out.push(lines.join('\n'), '')
  }
  for (const scenario of ['zoom', 'panel-resize']) {
    out.push(table(scenario, size, scenario, [
      ['Layout change visible, p50 (ms)', 'layoutChangeMs', 'p50'],
      ['Sharper bitmap visible, p50 (ms)', 'bitmapChangeMs', 'p50'],
      ['PDF generations per run, p50', 'generationsPerRun', 'p50'],
      ['Longest main-thread task, p95 (ms)', 'longTaskMaxMs', 'p95'],
    ]), '')
  }
  const resources = (side) => side.sizes[size]?.scenarios?.['typing-normal']?.resources ?? {}
  out.push('#### Resources after the typing-normal runs', '', '| Metric | Before | After |', '|---|---|---|')
  for (const key of ['rssBeforeMiB', 'rssPeakMiB', 'rssAfterMiB', 'heapBeforeMiB', 'heapAfterMiB', 'dedicatedWorkers', 'liveCanvasObjects', 'attachedCanvases', 'totalCanvasesCreated', 'totalOffscreenCreated', 'totalWorkersCreated']) {
    out.push(`| ${key} | ${fmt(resources(before)[key])} | ${fmt(resources(after)[key])} |`)
  }
  out.push('')
}
console.log(out.join('\n'))
