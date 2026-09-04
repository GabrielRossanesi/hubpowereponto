type PerformanceMetadata = Record<string, string | number | boolean | null | undefined>;

const shouldLogPerformance =
  process.env.NODE_ENV !== 'production' || process.env.PERF_LOGGING === '1';

/**
 * Logs a structured, tenant-safe duration for server work.
 * Keep metadata limited to operation names and aggregate counts.
 */
export async function measureServerTiming<T>(
  name: string,
  operation: () => Promise<T>,
  metadata: PerformanceMetadata = {},
): Promise<T> {
  const startedAt = performance.now();
  let status: 'ok' | 'error' = 'ok';

  try {
    return await operation();
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    if (shouldLogPerformance) {
      console.info(JSON.stringify({
        event: 'nvhub.performance',
        name,
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
        status,
        ...metadata,
      }));
    }
  }
}
