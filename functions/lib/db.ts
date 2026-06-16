import { HttpError } from "./responses";
import type { D1Database, D1PreparedStatement, D1Value, Env } from "./types";

export function getDb(env: Env): D1Database {
  if (!env.DB) {
    throw new HttpError("D1 binding DB is not configured", 503);
  }

  return env.DB;
}

export function prepare(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): D1PreparedStatement {
  const statement = db.prepare(query);
  return values.length > 0 ? statement.bind(...values) : statement;
}

export async function allRows<T>(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<T[]> {
  const result = await prepare(db, query, values).all<T>();
  return result.results ?? [];
}

export async function firstRow<T>(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<T | null> {
  const result = await prepare(db, query, values).all<T>();
  return result.results?.[0] ?? null;
}

export async function countRows(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<number> {
  const row = await firstRow<{ count: number }>(db, query, values);
  return Number(row?.count ?? 0);
}
