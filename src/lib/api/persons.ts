export type RealPersonStatus = "active" | "archived";

export interface RealPerson {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  status: RealPersonStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PersonPayload {
  name?: string;
  relationship?: string | null;
  notes?: string | null;
  status?: RealPersonStatus;
}

export interface PersonFilters {
  status?: RealPersonStatus;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload || payload.ok !== true) {
    throw new Error(payload?.error ?? "No se pudo completar la operacion.");
  }

  return payload.data;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

function jsonBody(payload: object): string {
  return JSON.stringify(payload);
}

function personsPath(filters: PersonFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/persons?${query}` : "/api/persons";
}

export function fetchPersons(filters: PersonFilters = {}): Promise<RealPerson[]> {
  return apiFetch<RealPerson[]>(personsPath(filters));
}

export function createPerson(payload: Required<Pick<PersonPayload, "name">> & PersonPayload): Promise<RealPerson> {
  return apiFetch<RealPerson>("/api/persons", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updatePerson(personId: string, payload: PersonPayload): Promise<RealPerson> {
  return apiFetch<RealPerson>(`/api/persons/${encodeURIComponent(personId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}
