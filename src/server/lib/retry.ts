export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("rate limit") ||
      error?.message?.includes("Quota exceeded");

    if (retries > 0 && isRateLimit) {
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
