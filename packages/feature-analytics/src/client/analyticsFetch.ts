type JsonError = { error?: string };

export async function fetchAnalyticsApi<T>(
  apiBaseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = apiBaseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Invalid JSON from analytics API");
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as JsonError).error ?? `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}
