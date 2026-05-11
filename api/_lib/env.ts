import fs from "node:fs";
import path from "node:path";

let loaded = false;

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return null;

  const [rawKey, ...valueParts] = trimmed.split("=");
  const key = rawKey.trim();
  if (!key) return null;

  const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
  return [key, value];
}

export function loadLocalEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    const contents = fs.readFileSync(candidate, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const pair = parseEnvLine(line);
      if (!pair) continue;

      const [key, value] = pair;
      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    }
  }
}

export function optionalEnv(key: string): string {
  loadLocalEnv();
  return process.env[key]?.trim() || "";
}

export function requireEnv(key: string): string {
  const value = optionalEnv(key);
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}
