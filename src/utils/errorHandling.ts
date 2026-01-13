/**
 * Error handling utilities
 */

/**
 * Wrap an async function with standardized error handling
 *
 * @param fn - The async function to wrap
 * @param errorMessage - Custom error message prefix
 * @returns The result of the function or throws with enhanced error
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`${errorMessage}: ${message}`);
  }
}

/**
 * Wrap an async function and return a tuple [result, error]
 * Never throws, always returns
 *
 * @param fn - The async function to wrap
 * @returns Tuple of [result, null] on success or [null, error] on failure
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return [null, err];
  }
}

/**
 * Retry an async function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        onRetry?.(lastError, attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Execute a function and log any errors without throwing
 *
 * @param fn - The function to execute
 * @param context - Context string for logging
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return undefined;
  }
}
