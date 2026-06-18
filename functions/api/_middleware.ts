import { getAuthenticatedUser } from "../lib/auth";
import { error } from "../lib/responses";
import type { PagesContext } from "../lib/types";
import { AUTH_ENABLED } from "../../shared/auth-config";

interface MiddlewareContext extends PagesContext {
  next: () => Promise<Response>;
}

const PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
]);

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { pathname } = new URL(context.request.url);
  const method = context.request.method.toUpperCase();

  if (method === "OPTIONS" || PUBLIC_API_PATHS.has(pathname)) {
    return context.next();
  }

  if (!AUTH_ENABLED) {
    return error("Unauthorized", 401);
  }

  try {
    const user = await getAuthenticatedUser(context.request, context.env);

    if (!user) {
      return error("Unauthorized", 401);
    }

    return context.next();
  } catch (caughtError) {
    console.error("API auth middleware error", caughtError);
    return error("Unauthorized", 401);
  }
}
