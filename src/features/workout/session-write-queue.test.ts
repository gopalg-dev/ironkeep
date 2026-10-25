import { afterEach, describe, expect, it, jest } from '@jest/globals'

import { SessionWriteQueue } from './session-write-queue'

afterEach(() => {
  jest.useRealTimers()
})

describe('session writes shared with notification controls', () => {
  it('flushes only the latest debounced value before leaving the app', async () => {
    jest.useFakeTimers()
    const begin = jest.fn()
    const end = jest.fn()
    const first = jest.fn(async () => {})
    const last = jest.fn(async () => {})
    const queue = new SessionWriteQueue(begin, end, jest.fn())
    queue.save('session:lift', first, false)
    queue.save('session:lift', last, false)
    await queue.flush()
    expect(first).not.toHaveBeenCalled()
    expect(last).toHaveBeenCalledTimes(1)
    expect(begin).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('serializes different exercises and waits for immediate writes too', async () => {
    const order: string[] = []
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const queue = new SessionWriteQueue(jest.fn(), jest.fn(), jest.fn())
    queue.save(
      'a',
      async () => {
        order.push('a start')
        await gate
        order.push('a end')
      },
      true,
    )
    queue.save(
      'b',
      async () => {
        order.push('b')
      },
      true,
    )
    const flushed = queue.flush()
    await Promise.resolve()
    expect(order).toEqual(['a start'])
    release()
    await flushed
    expect(order).toEqual(['a start', 'a end', 'b'])
  })

  it('reports a failed save, releases the native write gate, and blocks finish', async () => {
    const end = jest.fn()
    const error = jest.fn()
    const queue = new SessionWriteQueue(jest.fn(), end, error)
    queue.save(
      'a',
      async () => {
        throw new Error('disk full')
      },
      true,
    )
    await expect(queue.flush()).rejects.toThrow('not saved')
    await expect(queue.flush()).rejects.toThrow('not saved')
    expect(error).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledTimes(1)
    queue.save('a', async () => {}, true)
    await expect(queue.flush()).resolves.toBeUndefined()
  })
})
