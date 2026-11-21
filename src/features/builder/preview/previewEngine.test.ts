import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import type { CVState } from '@/features/cv/model/types'
import { PreviewEngine } from './previewEngine'
import { PreviewError } from './previewTypes'
import { FakeCanvases, FakeClock, FakeGenerator, FakeRasterizer, flush } from './testing/fakes'

function cv(summary: string): CVState {
  return {
    ...defaultCVState,
    resume: { ...defaultCVState.resume, profile: { ...defaultCVState.resume.profile, name: 'Alex', summary } },
  }
}

function setup() {
  const clock = new FakeClock()
  const generator = new FakeGenerator()
  const rasterizer = new FakeRasterizer()
  const canvases = new FakeCanvases()
  const engine = new PreviewEngine({ generator, rasterizer, canvases, clock })
  engine.setScale(1)
  return { clock, generator, rasterizer, canvases, engine }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('PreviewEngine revisions', () => {
  it('generates, paints every page, and displays the first revision', async () => {
    const { engine, generator, canvases } = setup()
    engine.submit(cv('one'))
    expect(engine.getView().isUpdating).toBe(true)
    await generator.finish(['a', 'b'])
    const view = engine.getView()
    expect(view.displayedRevision).toBe(1)
    expect(view.pages).toHaveLength(2)
    expect(view.isUpdating).toBe(false)
    expect(canvases.painted.map((page) => page.index)).toEqual([0, 1])
  })

  it('ignores a state with unchanged content and keeps the newest object for export', async () => {
    const { engine, generator } = setup()
    const first = cv('one')
    engine.submit(first)
    await generator.finish(['a', 'b'])
    const touched = { ...first, updatedAt: '2030-01-01T00:00:00.000Z' }
    engine.submit(touched)
    expect(generator.calls).toHaveLength(1)
    const exported = await engine.exportCurrent()
    expect(exported.state).toBe(touched)
  })

  it('lets the newest state win and never generates intermediate ones', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    engine.submit(cv('two'))
    engine.submit(cv('three'))
    await generator.finish(['a1', 'b'])
    expect(engine.getView().displayedRevision).toBe(1)
    await clock.advance(500)
    expect(generator.calls.map((call) => call.revision)).toEqual([1, 3])
    await generator.finish(['a3', 'b'])
    expect(engine.getView().displayedRevision).toBe(3)
    await clock.advance(2000)
    expect(generator.calls).toHaveLength(2)
  })

  it('paints only pages whose content changed', async () => {
    const { engine, generator, canvases, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a1', 'b'])
    canvases.painted.length = 0
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.finish(['a2', 'b'])
    expect(canvases.painted.map((page) => page.index)).toEqual([0])
    expect(engine.getView().displayedRevision).toBe(2)
  })

  it('repaints all pages when pagination changes', async () => {
    const { engine, generator, canvases, clock, rasterizer } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    canvases.painted.length = 0
    rasterizer.pageCount = 3
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.finish(['a', 'b-moved', 'c'])
    expect(canvases.painted.map((page) => page.index)).toEqual([1, 2])
    expect(engine.getView().pages).toHaveLength(3)
    expect(canvases.count).toBe(3)
  })

  it('destroys the superseded document when a newer one is displayed', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.finish(['a2', 'b'])
    expect(rasterizer.opened.map((opened) => opened.doc.destroyed)).toEqual([true, false])
  })
})

describe('PreviewEngine display scale', () => {
  it('repaints at the new scale from the retained document without regenerating', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    const doc = rasterizer.opened[0].doc
    doc.rendered.length = 0
    engine.setScale(2)
    await clock.advance(100)
    expect(doc.rendered).toHaveLength(0)
    await clock.advance(100)
    expect(doc.rendered).toEqual([{ index: 0, scale: 2 }, { index: 1, scale: 2 }])
    expect(generator.calls).toHaveLength(1)
    expect(rasterizer.opened).toHaveLength(1)
    expect(engine.getView().isUpdating).toBe(false)
  })

  it('does not repaint for a scale change within tolerance', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    rasterizer.opened[0].doc.rendered.length = 0
    engine.setScale(1.03)
    await clock.advance(1000)
    expect(rasterizer.opened[0].doc.rendered).toHaveLength(0)
  })

  it('pauses while hidden and resumes with the newest state', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.setScale(0)
    engine.submit(cv('two'))
    engine.submit(cv('three'))
    await clock.advance(1000)
    expect(generator.calls).toHaveLength(1)
    engine.setScale(1)
    expect(generator.calls.map((call) => call.revision)).toEqual([1, 3])
  })
})

describe('PreviewEngine export', () => {
  it('returns the displayed document when it is current', async () => {
    const { engine, generator } = setup()
    const state = cv('one')
    engine.submit(state)
    await generator.finish(['a', 'b'])
    const exported = await engine.exportCurrent()
    expect(exported.revision).toBe(1)
    expect(exported.state).toBe(state)
    expect(new TextDecoder().decode(exported.bytes)).toBe('pdf-1')
  })

  it('waits for the update that was pending and exports exactly that revision', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    const newer = cv('two')
    engine.submit(newer)
    let settled = false
    const exporting = engine.exportCurrent().then((result) => { settled = true; return result })
    await flush()
    expect(settled).toBe(false)
    await clock.advance(10)
    await generator.finish(['a2', 'b'])
    const exported = await exporting
    expect(exported.revision).toBe(2)
    expect(exported.state).toBe(newer)
    expect(new TextDecoder().decode(exported.bytes)).toBe('pdf-2')
  })

  it('never exports an older revision than the one requested', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.submit(cv('two'))
    const exporting = engine.exportCurrent()
    engine.submit(cv('three'))
    await clock.advance(10)
    await generator.finish(['a2', 'b'])
    const exported = await exporting
    expect(exported.revision).toBeGreaterThanOrEqual(2)
    expect(engine.getView().displayedRevision).toBe(exported.revision)
  })

  it('still generates for an export while the preview is hidden', async () => {
    const { engine, generator } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.setScale(0)
    engine.submit(cv('two'))
    const exporting = engine.exportCurrent()
    await flush()
    expect(generator.calls).toHaveLength(2)
    await generator.finish(['a2', 'b'])
    expect((await exporting).revision).toBe(2)
  })

  it('rejects when there is nothing to export or the update fails', async () => {
    const { engine, generator } = setup()
    await expect(engine.exportCurrent()).rejects.toThrow()
    engine.submit(cv('one'))
    const exporting = engine.exportCurrent()
    const outcome = expect(exporting).rejects.toBeInstanceOf(PreviewError)
    await generator.fail(new PreviewError('failed', 'bad document'))
    await outcome
  })
})

describe('PreviewEngine failures and lifecycle', () => {
  it('retries once automatically after a worker crash', async () => {
    const { engine, generator, rasterizer } = setup()
    engine.submit(cv('one'))
    await generator.fail(new PreviewError('crash', 'worker died'))
    expect(rasterizer.disposed).toBe(1)
    expect(engine.getView().error).toBe('')
    await generator.finish(['a', 'b'])
    expect(engine.getView().displayedRevision).toBe(1)
    expect(generator.calls).toHaveLength(2)
  })

  it('reports an error after the retry also fails and keeps the displayed pages', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.fail(new PreviewError('timeout', 'hung'))
    await generator.fail(new PreviewError('timeout', 'hung again'))
    const view = engine.getView()
    expect(view.error).toBe('Preview could not be updated.')
    expect(view.pages).toHaveLength(2)
    expect(view.displayedRevision).toBe(1)
  })

  it('does not retry a deterministic generation failure', async () => {
    const { engine, generator } = setup()
    engine.submit(cv('one'))
    await generator.fail(new PreviewError('failed', 'layout error'))
    expect(engine.getView().error).not.toBe('')
    expect(generator.calls).toHaveLength(1)
  })

  it('recovers on retry and on the next edit', async () => {
    const { engine, generator, clock } = setup()
    engine.submit(cv('one'))
    await generator.fail(new PreviewError('failed', 'layout error'))
    engine.retry()
    await generator.finish(['a', 'b'])
    expect(engine.getView().error).toBe('')
    expect(engine.getView().displayedRevision).toBe(1)
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.fail(new PreviewError('failed', 'layout error'))
    expect(engine.getView().error).not.toBe('')
    engine.submit(cv('three'))
    await clock.advance(500)
    await generator.finish(['a3', 'b'])
    expect(engine.getView().error).toBe('')
  })

  it('reopens the displayed document from its own bytes after a worker reset', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    rasterizer.dispose()
    engine.setScale(2)
    await clock.advance(200)
    expect(rasterizer.opened).toHaveLength(2)
    expect(rasterizer.opened[1].label).toBe('pdf-1')
    expect(rasterizer.opened[1].doc.rendered).toHaveLength(2)
  })

  it('stops everything on release and ignores late results', async () => {
    const { engine, generator, rasterizer, canvases } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.submit(cv('two'))
    const exporting = engine.exportCurrent()
    const outcome = expect(exporting).rejects.toBeInstanceOf(PreviewError)
    engine.release()
    await outcome
    expect(generator.disposed).toBe(1)
    expect(rasterizer.opened[0].doc.destroyed).toBe(true)
    expect(canvases.cleared).toBeGreaterThan(0)
    expect(engine.getView().pages).toHaveLength(0)
    expect(engine.getView().displayedRevision).toBeNull()
  })

  it('stays usable after release, as a remount in development requires', async () => {
    const { engine, generator } = setup()
    engine.submit(cv('one'))
    engine.release()
    engine.setScale(1)
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    // Revisions keep counting up across a release; they are never reused.
    expect(engine.getView().displayedRevision).toBe(2)
  })

  it('clears the view for an empty CV without stopping idle workers', async () => {
    const { engine, generator, canvases } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    engine.clear()
    expect(engine.getView().pages).toHaveLength(0)
    expect(canvases.count).toBe(0)
    expect(generator.disposed).toBe(0)
  })

  it('does not let a failed open leave the superseded document destroyed early', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    rasterizer.failNextOpen = new PreviewError('failed', 'unreadable pdf')
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.finish(['a2', 'b'])
    expect(engine.getView().error).not.toBe('')
    expect(engine.getView().pages).toHaveLength(2)
    expect(rasterizer.opened[0].doc.destroyed).toBe(false)
  })

  it('updates page links and publishes new view when annotations change', async () => {
    const { engine, generator, rasterizer, clock } = setup()
    engine.submit(cv('one'))
    await generator.finish(['a', 'b'])
    expect(engine.getView().pages[0].links).toEqual([])

    // Update with a new link on page 0
    rasterizer.nextPages = [
      {
        width: 595,
        height: 842,
        links: [{ url: 'https://github.com/odysseus-dev/odysseus', left: 100, top: 150, width: 200, height: 20 }],
      },
      { width: 595, height: 842, links: [] },
    ]
    engine.submit(cv('two'))
    await clock.advance(500)
    await generator.finish(['a2', 'b'])

    const view = engine.getView()
    expect(view.displayedRevision).toBe(2)
    expect(view.pages[0].links).toHaveLength(1)
    expect(view.pages[0].links[0].url).toBe('https://github.com/odysseus-dev/odysseus')
  })
})
