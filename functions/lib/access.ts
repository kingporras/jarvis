import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from "jose";
import { error } from "./responses";
import type { Env } from "./types";

export interface AccessIdentity {
  authenticated: true;
  email?: string;
  subject: string;
}

export class AccessError extends Error {
  status: 401 | 403 | 503;

  constructor(status: 401 | 403 | 503, message: string) {
    super(message);
    this.status = status;
  }
}

type RemoteJwks = ReturnType<typeof createRemoteJWKSet>;

const jwksCache = new Map<string, RemoteJwks>();

function normalizeTeamDomain(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new AccessError(503, "Access configuration unavailable");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new AccessError(503, "Access configuration unavailable");
  }

  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new AccessError(503, "Access configuration unavailable");
  }

  return url.origin;
}

function parseAudiences(value: string | undefined): string[] {
  const audiences = Array.from(
    new Set(
      value
        ?.split(",")
        .map((audience) => audience.trim())
        .filter(Boolean) ?? [],
    ),
  );

  if (audiences.length === 0) {
    throw new AccessError(503, "Access configuration unavailable");
  }

  return audiences;
}

function getJwks(teamDomain: string): RemoteJwks {
  const cached = jwksCache.get(teamDomain);

  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`), {
    cacheMaxAge: 10 * 60 * 1000,
    cooldownDuration: 30 * 1000,
    timeoutDuration: 5 * 1000,
  });

  jwksCache.set(teamDomain, jwks);
  return jwks;
}

function getAccessToken(request: Request): string {
  const token = request.headers.get("Cf-Access-Jwt-Assertion")?.trim();

  if (!token) {
    throw new AccessError(401, "Unauthorized");
  }

  if (token.split(".").length !== 3) {
    throw new AccessError(401, "Unauthorized");
  }

  return token;
}

function stringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function identityFromPayload(payload: JWTPayload): AccessIdentity {
  const subject = stringClaim(payload, "sub");
  const email = stringClaim(payload, "email");
  const commonName = stringClaim(payload, "common_name");

  if (!subject || commonName) {
    throw new AccessError(403, "Forbidden");
  }

  return email
    ? { authenticated: true, subject, email }
    : { authenticated: true, subject };
}

function accessStatusFromJoseError(caughtError: unknown): 401 | 403 | 503 {
  if (caughtError instanceof errors.JWTExpired) {
    return 401;
  }

  if (caughtError instanceof errors.JWTClaimValidationFailed) {
    return caughtError.claim === "aud" || caughtError.claim === "iss" ? 403 : 401;
  }

  if (
    caughtError instanceof errors.JWKSTimeout ||
    caughtError instanceof errors.JWKSInvalid ||
    caughtError instanceof errors.JWKSMultipleMatchingKeys ||
    caughtError instanceof errors.JWKInvalid
  ) {
    return 503;
  }

  return 401;
}

export async function requireAccess(request: Request, env: Env): Promise<AccessIdentity> {
  const teamDomain = normalizeTeamDomain(env.CLOUDFLARE_ACCESS_TEAM_DOMAIN);
  const audiences = parseAudiences(env.CLOUDFLARE_ACCESS_AUDS);
  const token = getAccessToken(request);

  try {
    const { payload, protectedHeader } = await jwtVerify(token, getJwks(teamDomain), {
      algorithms: ["RS256"],
      audience: audiences,
      issuer: teamDomain,
    });

    if (protectedHeader.alg !== "RS256") {
      throw new AccessError(401, "Unauthorized");
    }

    return identityFromPayload(payload);
  } catch (caughtError) {
    if (caughtError instanceof AccessError) {
      throw caughtError;
    }

    throw new AccessError(accessStatusFromJoseError(caughtError), "Access validation failed");
  }
}

export function isAccessIdentity(value: unknown): value is AccessIdentity {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as AccessIdentity).authenticated === true &&
    typeof (value as AccessIdentity).subject === "string" &&
    (value as AccessIdentity).subject.trim().length > 0
  );
}

export function accessErrorResponse(caughtError: unknown): Response {
  const status = caughtError instanceof AccessError ? caughtError.status : 503;
  const message = status === 403 ? "Forbidden" : status === 503 ? "Service unavailable" : "Unauthorized";

  return error(message, status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
