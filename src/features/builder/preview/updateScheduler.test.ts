import { describe, expect, it } from 'vitest'
import { UpdateScheduler } from './updateScheduler'
import { FakeClock } from './testing/fakes'

function setup(cycleMs: number) {
  const clock = new FakeClock()
  const starts: number[] = []
  const scheduler = new UpdateScheduler(() => {
    starts.push(clock.now())
    return clock.sleep(cycleMs)
  }, clock)
  return { clock, starts, scheduler }
}

describe('UpdateScheduler', () => {
  it('starts the first request after a quiet period immediately', () => {
    const { scheduler, starts } = setup(30)
    scheduler.request()
    expect(starts).toEqual([0])
  })

  it('never runs two cycles at once and collapses requests into one follow-up', async () => {
    const { clock, scheduler, starts } = setup(30)
    scheduler.request()
    scheduler.request()
    scheduler.request()
    expect(starts).toHaveLength(1)
    await clock.advance(30)
    await clock.advance(200)
    expect(starts).toHaveLength(2)
    await clock.advance(1000)
    expect(starts).toHaveLength(2)
  })

  it('spaces cycle starts by the measured cost during continuous editing', async () => {
    const { clock, scheduler, starts } = setup(100)
    for (let tick = 0; tick < 40; tick += 1) {
      scheduler.request()
      await clock.advance(20)
    }
    await clock.advance(1000)
    const gaps = starts.slice(1).map((start, index) => start - starts[index])
    // Cycles take 100 ms, so starts are at least that far apart, and the
    // preview is never starved: an update starts about every cycle.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(100)
    expect(Math.max(...gaps)).toBeLessThanOrEqual(260)
    expect(starts.length).toBeGreaterThan(5)
  })

  it('spaces cycles by the reported main-thread cost, not by worker time', async () => {
    const clock = new FakeClock()
    const starts: number[] = []
    const scheduler = new UpdateScheduler(async () => {
      starts.push(clock.now())
      await clock.sleep(300)
      return 10
    }, clock)
    for (let tick = 0; tick < 5; tick += 1) {
      scheduler.request()
      await clock.advance(100)
    }
    await clock.advance(2000)
    // Each cycle runs 300 ms in a worker but costs the main thread 10 ms, so
    // the next cycle starts as soon as the previous one finishes.
    expect(starts.slice(0, 3)).toEqual([0, 300, 600])
    expect(scheduler.gapMs).toBeLessThan(40)
  })

  it('caps the spacing so a slow cycle cannot delay the next start indefinitely', async () => {
    const { clock, scheduler } = setup(2000)
    scheduler.request()
    await clock.advance(2000)
    expect(scheduler.gapMs).toBeLessThanOrEqual(250)
  })

  it('bypasses the spacing for an immediate request', async () => {
    const { clock, scheduler, starts } = setup(100)
    scheduler.request()
    await clock.advance(100)
    scheduler.request({ immediate: true })
    expect(starts).toHaveLength(2)
    expect(starts[1]).toBe(100)
  })

  it('holds work while paused and resumes at once', async () => {
    const { clock, scheduler, starts } = setup(10)
    scheduler.setPaused(true)
    scheduler.request()
    await clock.advance(1000)
    expect(starts).toHaveLength(0)
    scheduler.setPaused(false)
    expect(starts).toHaveLength(1)
  })

  it('does nothing after dispose', async () => {
    const { clock, scheduler, starts } = setup(10)
    scheduler.request()
    scheduler.request()
    scheduler.dispose()
    await clock.advance(1000)
    expect(starts).toHaveLength(1)
    scheduler.request()
    expect(starts).toHaveLength(1)
  })
})
