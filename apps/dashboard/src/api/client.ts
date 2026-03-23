export const API_BASE = "http://localhost:3000/api/v1";

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  apiKey?: string;
  headers?: Record<string, string>;
};

function buildHeaders(apiKey?: string, headers: Record<string, string> = {}): Record<string, string> {
  const trimmedApiKey = apiKey?.trim() ?? "";

  if (!trimmedApiKey) {
    return headers;
  }

  return {
    ...headers,
    "x-api-key": trimmedApiKey,
  };
}

// Shared API request helper for dashboard calls.
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.apiKey, options.headers ?? {}),
  });

  let json: unknown = null;

  try {
    json = await response.json();
  } catch {
    // Ignore parse errors and fallback to status-based message below.
  }

  if (!response.ok) {
    const errorMessage =
      (json as { error?: { message?: string } } | null)?.error?.message ||
      `Request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return json as T;
}
