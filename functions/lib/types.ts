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

export interface Env {
  DB?: D1Database;
  JARVIS_AUTH_PASSWORD_HASH?: string;
  JARVIS_SESSION_TTL_DAYS?: string;
}

export interface PagesContext {
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
