export type SendPostResult = {
  statusCode: number;
  body: string;
  durationMs: number;
};

// Sends an HTTP POST request using Node.js built-in fetch.
// Handles timeout and network errors.
export async function sendPost(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<SendPostResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      body: responseText,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms (duration: ${durationMs}ms)`);
    }

    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}
