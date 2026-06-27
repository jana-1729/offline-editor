/** Thin fetch wrapper for client components. Throws on non-2xx with the
 * server-provided error message when available. */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
