export interface JarvisJsonExport {
  ok: true;
  exportedAt: string;
  version: number;
  data: {
    projects: unknown[];
    tasks: unknown[];
    memory: unknown[];
    memoryLinks: unknown[];
    decisions: unknown[];
    persons: unknown[];
    reminders: unknown[];
  };
}

type ExportResponse = JarvisJsonExport | { ok: false; error: string };

export async function fetchJarvisJsonExport(): Promise<JarvisJsonExport> {
  const response = await fetch("/api/export/json");
  const payload = (await response.json().catch(() => null)) as ExportResponse | null;

  if (!payload || payload.ok !== true) {
    throw new Error(payload?.error ?? "No se pudo exportar JSON.");
  }

  return payload;
}
