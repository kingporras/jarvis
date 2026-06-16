import { expiredSessionCookie, getCookie, SESSION_COOKIE_NAME, sessionCookie } from "./cookies";
import { getDb, firstRow, prepare } from "./db";
import { generateSessionToken, sha256Hex, verifyPassword } from "./crypto";
import type { D1Database, Env, User } from "./types";
import { VICTOR_USER } from "./types";

interface SessionRow {
  expires_at: string | null;
  id: string;
  revoked_at: string | null;
  user_id: string | null;
}

const DEFAULT_TTL_DAYS = 14;
const SECONDS_PER_DAY = 24 * 60 * 60;

export function nowIso(): string {
  return new Date().toISOString();
}

export function getSessionTtlDays(env: Env): number {
  const configuredValue = Number(env.JARVIS_SESSION_TTL_DAYS);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_TTL_DAYS;
  }

  return Math.min(Math.floor(configuredValue), 90);
}

export function getSessionMaxAgeSeconds(env: Env): number {
  return getSessionTtlDays(env) * SECONDS_PER_DAY;
}

export function sessionExpiresAt(env: Env): string {
  const expiresAt = new Date(Date.now() + getSessionMaxAgeSeconds(env) * 1000);
  return expiresAt.toISOString();
}

export async function ensureVictorUser(db: D1Database): Promise<void> {
  const timestamp = nowIso();

  await prepare(
    db,
    "INSERT OR IGNORE INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [VICTOR_USER.id, VICTOR_USER.name, null, timestamp, timestamp],
  ).run();
}

export async function validatePassword(env: Env, password: string): Promise<boolean> {
  const encodedHash = env.JARVIS_AUTH_PASSWORD_HASH;

  if (!encodedHash) {
    return false;
  }

  return verifyPassword(password, encodedHash);
}

export async function createSession(request: Request, env: Env): Promise<{ cookie: string; user: User }> {
  const db = getDb(env);
  const token = generateSessionToken();
  const tokenHash = await sha256Hex(token);
  const timestamp = nowIso();
  const userAgent = request.headers.get("User-Agent");

  await ensureVictorUser(db);
  await prepare(
    db,
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      crypto.randomUUID(),
      VICTOR_USER.id,
      tokenHash,
      sessionExpiresAt(env),
      timestamp,
      null,
      userAgent,
    ],
  ).run();

  return {
    cookie: sessionCookie(token, getSessionMaxAgeSeconds(env), request),
    user: VICTOR_USER,
  };
}

export async function getAuthenticatedUser(request: Request, env: Env): Promise<User | null> {
  const token = getCookie(request, SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const db = getDb(env);
  const tokenHash = await sha256Hex(token);
  const session = await firstRow<SessionRow>(
    db,
    "SELECT id, user_id, expires_at, revoked_at FROM sessions WHERE token_hash = ? LIMIT 1",
    [tokenHash],
  );

  if (!session || session.user_id !== VICTOR_USER.id || session.revoked_at) {
    return null;
  }

  if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return VICTOR_USER;
}

export async function revokeSession(request: Request, env: Env): Promise<string> {
  const token = getCookie(request, SESSION_COOKIE_NAME);

  if (token) {
    const db = getDb(env);
    const tokenHash = await sha256Hex(token);

    await prepare(
      db,
      "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
      [nowIso(), tokenHash],
    ).run();
  }

  return expiredSessionCookie(request);
}
