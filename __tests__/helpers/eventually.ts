// Test Helper: Eventually (replaces fixed setTimeout waits)
// Purpose: Poll for condition with timeout (reliable trigger waiting)

interface EventuallyOptions {
  timeout?: number
  interval?: number
  errorMessage?: string
}

export async function eventually<T>(
  fn: () => Promise<T>,
  options: EventuallyOptions = {}
): Promise<T> {
  const timeout = options.timeout || 5000
  const interval = options.interval || 100
  const startTime = Date.now()

  while (true) {
    try {
      const result = await fn()
      if (result) return result
    } catch (err) {
      // Continue polling
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(options.errorMessage || `Timeout after ${timeout}ms`)
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }
}
