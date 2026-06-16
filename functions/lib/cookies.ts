export const SESSION_COOKIE_NAME = "jarvis_session";

interface CookieOptions {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
}

export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === name) {
      return rawValue.join("=");
    }
  }

  return null;
}

export function isLocalRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

export function shouldUseSecureCookie(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === "https:" || !isLocalRequest(request);
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  parts.push(`Path=${options.path ?? "/"}`);
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.httpOnly ?? true) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function sessionCookie(token: string, maxAgeSeconds: number, request: Request): string {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "Lax",
    secure: shouldUseSecureCookie(request),
  });
}

export function expiredSessionCookie(request: Request): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: shouldUseSecureCookie(request),
  });
}
