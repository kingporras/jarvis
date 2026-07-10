export type D1Value = string | number | null;

export interface D1Result<T> {
  results?: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  AI?: WorkersAiBinding;
  AI_PROVIDER?: string;
  CLOUDFLARE_ACCESS_AUDS?: string;
  CLOUDFLARE_ACCESS_TEAM_DOMAIN?: string;
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MAX_OUTPUT_TOKENS?: string;
  OPENAI_MODEL?: string;
  WORKERS_AI_MODEL?: string;
}

export interface PagesContext {
  data?: Record<string, unknown>;
  request: Request;
  env: Env;
  params: {
    path?: string | string[];
  };
  next?: () => Promise<Response>;
}

export interface User {
  id: "victor";
  name: "Victor";
}

export const VICTOR_USER: User = {
  id: "victor",
  name: "Victor",
};
