type Pending = { write: () => Promise<void>; timer: ReturnType<typeof setTimeout> }

/** Serialize whole-entry writes and drain debounced edits before leaving the app or finishing. */
export class SessionWriteQueue {
  private pending = new Map<string, Pending>()
  private tail: Promise<void> = Promise.resolve()
  private failed = new Set<string>()

  constructor(
    private readonly begin: () => void,
    private readonly end: () => void,
    private readonly onError: (error: unknown) => void,
  ) {}

  save(key: string, write: () => Promise<void>, immediate: boolean): void {
    const previous = this.pending.get(key)
    if (previous) clearTimeout(previous.timer)
    else this.begin()
    this.pending.set(key, { write, timer: setTimeout(() => this.run(key), immediate ? 0 : 500) })
    if (immediate) this.run(key)
  }

  private run(key: string): void {
    const pending = this.pending.get(key)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending.delete(key)
    this.tail = this.tail
      .then(async () => {
        await pending.write()
        this.failed.delete(key)
      })
      .catch((error: unknown) => {
        this.failed.add(key)
        this.onError(error)
      })
      .finally(this.end)
  }

  async flush(prefix = ''): Promise<void> {
    for (const key of this.pending.keys()) if (key.startsWith(prefix)) this.run(key)
    await this.tail
    if ([...this.failed].some((key) => key.startsWith(prefix))) throw new Error('A set was not saved')
  }
}
