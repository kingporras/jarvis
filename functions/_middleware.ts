import { getAuthenticatedUser } from "./lib/auth";
import type { PagesContext } from "./lib/types";

interface MiddlewareContext extends PagesContext {
  next: () => Promise<Response>;
}

const ASSET_PREFIXES = ["/assets/", "/icons/"];
const PUBLIC_FILES = new Set([
  "/favicon.svg",
  "/manifest.webmanifest",
  "/robots.txt",
  "/apple-touch-icon.png",
]);

function isStaticAsset(pathname: string): boolean {
  return (
    ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILES.has(pathname) ||
    /\.[a-zA-Z0-9]{2,8}$/.test(pathname)
  );
}

function redirectToLogin(request: Request): Response {
  const url = new URL(request.url);
  const nextPath = `${url.pathname}${url.search}`;
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("next", nextPath);

  return Response.redirect(loginUrl.toString(), 302);
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const url = new URL(context.request.url);
  const { pathname } = url;

  if (pathname.startsWith("/api/") || isStaticAsset(pathname)) {
    return context.next();
  }

  const user = await getAuthenticatedUser(context.request, context.env).catch(() => null);

  if (pathname === "/login" || pathname === "/login/") {
    return user ? Response.redirect(new URL("/", url.origin).toString(), 302) : context.next();
  }

  return user ? context.next() : redirectToLogin(context.request);
}
