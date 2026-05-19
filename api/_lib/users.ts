import { firebaseGet } from "./firebase.js";
import fs from "node:fs/promises";
import path from "node:path";
import type { FirebaseUserRecord, PublicUser } from "./types.js";

let localExportCache: Record<string, unknown> | null | undefined;

export function publicUser(user: FirebaseUserRecord): PublicUser {
  const normalizedType = String(user.user_type || (user.is_superuser ? "admin" : "staff")).toLowerCase();
  const shopFields = {
    ...(user.shop ? { shop: user.shop } : {}),
    ...(user.shop_type ? { shop_type: user.shop_type } : {}),
    ...(user.assigned_shop ? { assigned_shop: user.assigned_shop } : {}),
    ...(user.assigned_shop_type ? { assigned_shop_type: user.assigned_shop_type } : {}),
  };

  return {
    id: user.id,
    email: user.email,
    user_type: normalizedType,
    is_superuser: !!user.is_superuser,
    is_staff: !!user.is_staff,
    is_active: user.is_active ?? true,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    groups: Array.isArray(user.groups) ? user.groups : [],
    user_permissions: Array.isArray(user.user_permissions) ? user.user_permissions : [],
    last_login: user.last_login || null,
    date_joined: user.date_joined || new Date().toISOString(),
    ...shopFields,
  };
}

function normalizeRecords(value: unknown): FirebaseUserRecord[] {
  return Object.values((value as Record<string, FirebaseUserRecord>) || {});
}

async function readLocalExport(): Promise<Record<string, unknown> | null> {
  if (localExportCache !== undefined) return localExportCache;

  const candidates = [
    path.resolve(process.cwd(), "..", "exports", "firebase", "firebase_realtime_database.json"),
    path.resolve(process.cwd(), "exports", "firebase", "firebase_realtime_database.json"),
  ];

  for (const candidate of candidates) {
    try {
      localExportCache = JSON.parse(await fs.readFile(candidate, "utf8")) as Record<string, unknown>;
      return localExportCache;
    } catch {
      // Try the next likely local path.
    }
  }

  localExportCache = null;
  return null;
}

async function firebaseOrLocal(pathName: string): Promise<unknown> {
  const firebaseValue = await firebaseGet(pathName).catch(() => undefined);
  if (firebaseValue !== undefined && firebaseValue !== null) return firebaseValue;

  const localExport = await readLocalExport();
  return localExport?.[pathName] || null;
}

async function getAuthUsersForLogin(): Promise<unknown> {
  try {
    const firebaseValue = await firebaseGet("auth_users");
    if (firebaseValue !== null && firebaseValue !== undefined) return firebaseValue;
  } catch (error) {
    const localExport = await readLocalExport();
    if (localExport?.auth_users) return localExport.auth_users;
    if (localExport?.LaundryApp_userprofile) return localExport.LaundryApp_userprofile;

    const message = error instanceof Error ? error.message : "Unknown auth_users access error";
    throw new Error(
      `Server auth data is not accessible (${message}). Set FIREBASE_DATABASE_AUTH_TOKEN in Vercel so auth_users can be read server-side.`
    );
  }

  const localExport = await readLocalExport();
  if (localExport?.auth_users) return localExport.auth_users;
  if (localExport?.LaundryApp_userprofile) return localExport.LaundryApp_userprofile;

  throw new Error(
    "Server auth data is empty. Upload auth_users to Firebase or provide FIREBASE_DATABASE_AUTH_TOKEN for protected access."
  );
}

async function getProfileUsersForLogin(): Promise<unknown> {
  return firebaseOrLocal("LaundryApp_userprofile");
}

export async function findAuthUserByEmail(email: string): Promise<FirebaseUserRecord | null> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const authUsers = await getAuthUsersForLogin();
  const authUser = normalizeRecords(authUsers).find(
    (user) => String(user?.email || "").trim().toLowerCase() === normalizedEmail
  );

  const profileUsers = await getProfileUsersForLogin().catch(() => null);
  const profileUser = normalizeRecords(profileUsers).find(
    (user) => String(user?.email || "").trim().toLowerCase() === normalizedEmail
  );

  if (profileUser?.password || profileUser?.password_hash) {
    return {
      ...authUser,
      ...profileUser,
      password: profileUser.password,
      password_hash: profileUser.password_hash || undefined,
    };
  }

  if (authUser) {
    return {
      ...profileUser,
      ...authUser,
    };
  }

  return profileUser || null;
}

export async function findUserProfileByEmail(email: string): Promise<FirebaseUserRecord | null> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const profileUsers = await getProfileUsersForLogin().catch(() => null);
  return normalizeRecords(profileUsers).find(
    (user) => String(user?.email || "").trim().toLowerCase() === normalizedEmail
  ) || null;
}

export async function findUserById(id: string): Promise<FirebaseUserRecord | null> {
  const users = await firebaseOrLocal("auth_users");
  const user = normalizeRecords(users).find((item) => String(item?.id) === String(id));
  if (user) return user;

  const exportedUsers = await firebaseOrLocal("LaundryApp_userprofile");
  return normalizeRecords(exportedUsers).find((item) => String(item?.id) === String(id)) || null;
}
