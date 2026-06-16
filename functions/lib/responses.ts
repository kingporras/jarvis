export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function success<T>(data: T, init?: ResponseInit): Response {
  return json<ApiResponse<T>>({ ok: true, data }, init);
}

export function error(message: string, status = 400): Response {
  return json<ApiResponse<never>>({ ok: false, error: message }, { status });
}

export function notFound(): Response {
  return error("Not found", 404);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = await request.json();
    return asObject(payload);
  } catch {
    throw new HttpError("Invalid JSON payload", 400);
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("JSON payload must be an object", 400);
  }

  return value as Record<string, unknown>;
}
