import { optionalEnv } from "./env.js";

export const FIREBASE_PROJECT_CONFIG = {
  apiKey: "AIzaSyBtv6inyG8x4EbbQVFdeZ8CM_nT5wI6siM",
  authDomain: "cleanpage-6fa02.firebaseapp.com",
  databaseURL: "https://cleanpage-6fa02-default-rtdb.firebaseio.com",
  projectId: "cleanpage-6fa02",
  storageBucket: "cleanpage-6fa02.firebasestorage.app",
  messagingSenderId: "254596166930",
  appId: "1:254596166930:web:3e4b7d60517c446fceafcb",
  measurementId: "G-17QJBK3SKR",
};

const COLLECTION_MAP: Record<string, Record<string, string>> = {
  laundry: {
    customers: "LaundryApp_customer",
    orders: "LaundryApp_order",
    "order-items": "LaundryApp_orderitem",
    "expense-fields": "LaundryApp_expensefield",
    "expense-records": "LaundryApp_expenserecord",
    payments: "LaundryApp_payment",
    users: "LaundryApp_userprofile",
  },
  hotel: {
    "food-categories": "HotelApp_foodcategory",
    "food-items": "HotelApp_fooditem",
    orders: "HotelApp_hotelorder",
    "order-items": "HotelApp_hotelorderitem",
    "Hotelexpense-fields": "HotelApp_hotelexpensefield",
    "Hotelexpense-records": "HotelApp_hotelexpenserecord",
    "expense-fields": "HotelApp_hotelexpensefield",
    "expense-records": "HotelApp_hotelexpenserecord",
  },
};

function getDatabaseUrl(): string {
  const url = optionalEnv("FIREBASE_DATABASE_URL") || FIREBASE_PROJECT_CONFIG.databaseURL;
  return url.replace(/\/$/, "");
}

function authQuery(): string {
  const token = optionalEnv("FIREBASE_DATABASE_AUTH_TOKEN") || optionalEnv("FIREBASE_DATABASE_SECRET");
  return token ? `auth=${encodeURIComponent(token)}` : "";
}

function makeUrl(path: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params);
  const auth = authQuery();
  if (auth) {
    const [key, value] = auth.split("=");
    query.set(key, decodeURIComponent(value));
  }

  const qs = query.toString();
  return `${getDatabaseUrl()}/${path.replace(/^\/+/, "")}.json${qs ? `?${qs}` : ""}`;
}

export function normalizeCollection(app: string | undefined, endpoint: string | undefined, explicitCollection: string | undefined): string {
  if (explicitCollection) return explicitCollection;

  const cleaned = String(endpoint || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("?")[0];

  const firstSegment = cleaned.split("/")[0];
  return COLLECTION_MAP[String(app || "").toLowerCase()]?.[firstSegment] || firstSegment;
}

export function recordIdFromEndpoint(endpoint: string | undefined): string {
  const cleaned = String(endpoint || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("?")[0];
  const parts = cleaned.split("/");
  return parts.length > 1 ? parts[1] : "";
}

export async function firebaseGet(path: string, params?: Record<string, string>): Promise<any> {
  const response = await fetch(makeUrl(path, params));
  if (!response.ok) {
    throw new Error(`Firebase read failed: ${response.status}`);
  }
  return response.json();
}

export async function firebasePut(path: string, data: unknown): Promise<any> {
  const response = await fetch(makeUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Firebase write failed: ${response.status}`);
  }
  return response.json();
}

export async function firebasePatch(path: string, data: unknown): Promise<any> {
  const response = await fetch(makeUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Firebase update failed: ${response.status}`);
  }
  return response.json();
}

export async function firebaseDelete(path: string): Promise<null> {
  const response = await fetch(makeUrl(path), { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Firebase delete failed: ${response.status}`);
  }
  return null;
}

export function listFromFirebaseObject<T extends Record<string, unknown>>(value: Record<string, T> | T[] | null | undefined): Array<T & { firebase_key?: string }> {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as Array<T & { firebase_key?: string }>;
  return Object.entries(value).map(([key, record]) => ({
    firebase_key: key,
    ...(record || {}),
  })) as Array<T & { firebase_key?: string }>;
}
