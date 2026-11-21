// Stage timings are recorded as `pv:*` User Timing measures so the benchmark in
// tooling/bench-preview.mjs and the browser's performance panel can read them.
// They carry numbers only, never CV content.
export function measurePreviewStage(name: string, start: number, detail?: Record<string, number>) {
  if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return
  try {
    performance.measure(`pv:${name}`, { start, detail })
  } catch {
    // Metrics must never affect the preview.
  }
}

export function previewNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
