// Decides when the next preview cycle may start.
//
// A cycle (generate, rasterize, publish) never overlaps another, and requests
// that arrive while one runs collapse into a single follow-up that always uses
// the newest state. The first request after a quiet period starts at once.
// During continuous editing, cycle starts are spaced by a gap derived from the
// main-thread time cycles really take (generation runs in a worker and does
// not count), so the preview stays as current as the machine allows while the
// pipeline never uses more than about half of the main thread.

const INITIAL_COST_MS = 25
const GAP_FACTOR = 2
const MAX_GAP_MS = 250
const COST_SMOOTHING = 0.3

export interface SchedulerClock {
  now(): number
  setTimer(callback: () => void, delayMs: number): unknown
  clearTimer(handle: unknown): void
}

const realClock: SchedulerClock = {
  now: () => performance.now(),
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export class UpdateScheduler {
  private readonly cycle: () => Promise<number | void>
  private readonly clock: SchedulerClock
  private running = false
  private dirty = false
  private paused = false
  private disposed = false
  private timer: unknown = null
  private lastStartAt = Number.NEGATIVE_INFINITY
  private averageCostMs = INITIAL_COST_MS

  /**
   * `cycle` may resolve with the main-thread milliseconds it used. Without a
   * number, its whole duration is taken as the cost.
   */
  constructor(cycle: () => Promise<number | void>, clock: SchedulerClock = realClock) {
    this.cycle = cycle
    this.clock = clock
  }

  /** The state changed. Starts a cycle now or as soon as the gap allows. */
  request(options: { immediate?: boolean } = {}) {
    this.dirty = true
    if (options.immediate) this.lastStartAt = Number.NEGATIVE_INFINITY
    this.startWhenAllowed()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (paused) this.clearTimer()
    else this.startWhenAllowed()
  }

  /** Current spacing between cycle starts during continuous editing. */
  get gapMs() {
    return Math.min(MAX_GAP_MS, this.averageCostMs * GAP_FACTOR)
  }

  get isBusy() {
    return this.running || this.dirty
  }

  dispose() {
    this.disposed = true
    this.dirty = false
    this.clearTimer()
  }

  private startWhenAllowed() {
    if (this.disposed || this.paused || this.running || !this.dirty) return
    const wait = this.lastStartAt + this.gapMs - this.clock.now()
    if (wait <= 0) {
      this.clearTimer()
      this.start()
      return
    }
    if (this.timer === null) {
      this.timer = this.clock.setTimer(() => {
        this.timer = null
        this.startWhenAllowed()
      }, wait)
    }
  }

  private start() {
    this.dirty = false
    this.running = true
    this.lastStartAt = this.clock.now()
    const startedAt = this.lastStartAt
    const finish = (reported?: number | void) => {
      const cost = typeof reported === 'number' ? reported : this.clock.now() - startedAt
      this.averageCostMs += COST_SMOOTHING * (cost - this.averageCostMs)
      this.running = false
      this.startWhenAllowed()
    }
    this.cycle().then(finish, () => finish())
  }

  private clearTimer() {
    if (this.timer === null) return
    this.clock.clearTimer(this.timer)
    this.timer = null
  }
}
