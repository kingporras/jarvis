import { accessErrorResponse, requireAccess } from "../lib/access";
import type { PagesContext } from "../lib/types";

interface MiddlewareContext extends PagesContext {
  next: () => Promise<Response>;
}

const PUBLIC_API_PATHS = new Set([
  "/api/health",
]);

const LEGACY_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/login/",
  "/api/auth/logout/",
  "/api/auth/me/",
]);

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { pathname } = new URL(context.request.url);
  const method = context.request.method.toUpperCase();

  if (method === "OPTIONS" || PUBLIC_API_PATHS.has(pathname) || LEGACY_AUTH_PATHS.has(pathname)) {
    return context.next();
  }

  try {
    context.data = context.data ?? {};
    context.data.accessIdentity = await requireAccess(context.request, context.env);
    return context.next();
  } catch (caughtError) {
    return accessErrorResponse(caughtError);
  }
}
