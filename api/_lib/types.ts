import type { IncomingHttpHeaders } from "node:http";

export type QueryValue = string | undefined;

export interface RequestLike {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders & Record<string, string | string[] | undefined>;
  query: Record<string, QueryValue>;
  on(event: "data", listener: (chunk: Buffer | string) => void): this;
  on(event: "end", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
}

export interface ResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export interface PublicUser {
  id: number | string;
  email: string;
  user_type: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  first_name: string;
  last_name: string;
  groups: unknown[];
  user_permissions: unknown[];
  last_login: string | null;
  date_joined: string;
}

export interface FirebaseUserRecord extends Partial<PublicUser> {
  id: number | string;
  email: string;
  password?: string;
  password_hash?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  user_type: string;
  is_superuser: boolean;
  is_staff: boolean;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}
