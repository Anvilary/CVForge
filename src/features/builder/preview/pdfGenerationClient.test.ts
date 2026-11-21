import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import type { GenerateRequest, GenerationResponse } from './pdfGenerationProtocol'
import { PdfGenerationClient, type WorkerPort } from './pdfGenerationClient'
import { PreviewError } from './previewTypes'

class FakeWorker implements WorkerPort {
  requests: GenerateRequest[] = []
  terminated = false
  onmessage: WorkerPort['onmessage'] = null
  onerror: WorkerPort['onerror'] = null
  onmessageerror: WorkerPort['onmessageerror'] = null

  postMessage(message: GenerateRequest) { this.requests.push(message) }
  terminate() { this.terminated = true }
  reply(message: GenerationResponse) { this.onmessage?.({ data: message } as MessageEvent<GenerationResponse>) }
}

function setup(timeoutMs = 1000) {
  const workers: FakeWorker[] = []
  const client = new PdfGenerationClient(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker
  }, timeoutMs)
  return { client, workers }
}

const snapshot = (revision: number) => ({ revision, state: defaultCVState })
const keys = ['page']

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('PdfGenerationClient', () => {
  it('starts one worker lazily and returns the generated document', async () => {
    const { client, workers } = setup()
    expect(workers).toHaveLength(0)
    const pending = client.generate(snapshot(4))
    expect(workers).toHaveLength(1)
    const [request] = workers[0].requests
    workers[0].reply({ type: 'generated', id: request.id, bytes: new Uint8Array([1, 2, 3]).buffer, pageKeys: keys, generateMs: 5, fingerprintMs: 2 })
    const result = await pending
    expect(result.revision).toBe(4)
    expect(Array.from(result.bytes)).toEqual([1, 2, 3])
    expect(result.pageKeys).toEqual(keys)
  })

  it('reuses the same worker for later jobs', async () => {
    const { client, workers } = setup()
    for (const revision of [1, 2]) {
      const pending = client.generate(snapshot(revision))
      workers[0].reply({ type: 'generated', id: workers[0].requests.at(-1)!.id, bytes: new ArrayBuffer(1), pageKeys: keys, generateMs: 1, fingerprintMs: 1 })
      await pending
    }
    expect(workers).toHaveLength(1)
  })

  it('rejects a failed document without replacing the worker', async () => {
    const { client, workers } = setup()
    const pending = client.generate(snapshot(1))
    workers[0].reply({ type: 'failed', id: workers[0].requests[0].id, message: 'layout' })
    await expect(pending).rejects.toMatchObject({ kind: 'failed' })
    expect(workers[0].terminated).toBe(false)
  })

  it('terminates a crashed worker, rejects the job, and starts a new worker next time', async () => {
    const { client, workers } = setup()
    const pending = client.generate(snapshot(1))
    workers[0].onerror?.({} as ErrorEvent)
    await expect(pending).rejects.toMatchObject({ kind: 'crash' })
    expect(workers[0].terminated).toBe(true)
    void client.generate(snapshot(2))
    expect(workers).toHaveLength(2)
  })

  it('times out a worker that never answers and terminates it', async () => {
    const { client, workers } = setup(500)
    const pending = client.generate(snapshot(1))
    const outcome = expect(pending).rejects.toMatchObject({ kind: 'timeout' })
    await vi.advanceTimersByTimeAsync(500)
    await outcome
    expect(workers[0].terminated).toBe(true)
  })

  it('supersedes a waiting job and ignores its late result', async () => {
    const { client, workers } = setup()
    const first = client.generate(snapshot(1))
    const firstOutcome = expect(first).rejects.toMatchObject({ kind: 'aborted' })
    const second = client.generate(snapshot(2))
    await firstOutcome
    const [older, newer] = workers[0].requests
    workers[0].reply({ type: 'generated', id: older.id, bytes: new ArrayBuffer(1), pageKeys: ['old'], generateMs: 1, fingerprintMs: 1 })
    workers[0].reply({ type: 'generated', id: newer.id, bytes: new ArrayBuffer(1), pageKeys: ['new'], generateMs: 1, fingerprintMs: 1 })
    expect((await second).pageKeys).toEqual(['new'])
  })

  it('terminates the worker and rejects the running job on dispose', async () => {
    const { client, workers } = setup()
    const pending = client.generate(snapshot(1))
    const outcome = expect(pending).rejects.toBeInstanceOf(PreviewError)
    client.dispose()
    await outcome
    expect(workers[0].terminated).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores messages from a worker that was already replaced', async () => {
    const { client, workers } = setup()
    const first = client.generate(snapshot(1))
    const outcome = expect(first).rejects.toBeDefined()
    workers[0].onerror?.({} as ErrorEvent)
    await outcome
    const second = client.generate(snapshot(2))
    workers[0].reply({ type: 'generated', id: workers[0].requests[0].id, bytes: new ArrayBuffer(1), pageKeys: ['stale'], generateMs: 1, fingerprintMs: 1 })
    workers[1].reply({ type: 'generated', id: workers[1].requests[0].id, bytes: new ArrayBuffer(1), pageKeys: ['fresh'], generateMs: 1, fingerprintMs: 1 })
    expect((await second).pageKeys).toEqual(['fresh'])
  })
})
