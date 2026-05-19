import crypto from "node:crypto";

function timingSafeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyDjangoPbkdf2(password: string, encoded: string): boolean {
  const [algorithm, iterations, salt, hash] = String(encoded).split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) {
    return false;
  }

  const derived = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, "sha256")
    .toString("base64");

  return timingSafeEqualText(derived, hash);
}

export function verifyPassword(password?: string, storedPassword?: string): boolean {
  if (!password || !storedPassword) return false;

  if (String(storedPassword).startsWith("pbkdf2_sha256$")) {
    return verifyDjangoPbkdf2(password, storedPassword);
  }

  return timingSafeEqualText(password, storedPassword);
}

export function hashDjangoPbkdf2(password: string): string {
  const iterations = 1_000_000;
  const salt = crypto.randomBytes(12).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("base64");

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}
