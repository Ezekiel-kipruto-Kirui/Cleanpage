import crypto from "node:crypto";
import { requireEnv } from "./env.js";
import type { JwtPayload, PublicUser, RequestLike } from "./types.js";

const encoder = new TextEncoder();

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64url(input: string): string {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getJwtSecret(): string {
  return requireEnv("JWT_SECRET");
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const tokenPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(tokenPayload))}`;
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(unsigned)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return `${unsigned}.${signature}`;
}

export function verifyToken(token: string, expectedType: JwtPayload["type"] = "access"): JwtPayload {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) {
    throw new Error("Invalid token");
  }

  const unsigned = `${header}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(unsigned)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  const signatureBytes = encoder.encode(signature);
  const expectedBytes = encoder.encode(expectedSignature);
  if (signatureBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(signatureBytes, expectedBytes)) {
    throw new Error("Invalid token signature");
  }

  const decoded = JSON.parse(decodeBase64url(payload)) as JwtPayload;
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  if (expectedType && decoded.type !== expectedType) {
    throw new Error("Invalid token type");
  }

  return decoded;
}

export function bearerToken(req: RequestLike): string {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const value = Array.isArray(header) ? header[0] : header;
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export function issueAuthTokens(user: PublicUser): { access: string; refresh: string } {
  const basePayload = {
    sub: String(user.id),
    email: user.email,
    user_type: user.user_type,
    is_superuser: !!user.is_superuser,
    is_staff: !!user.is_staff,
  };

  return {
    access: signToken({ ...basePayload, type: "access" }, 60 * 60),
    refresh: signToken({ ...basePayload, type: "refresh" }, 7 * 24 * 60 * 60),
  };
}
