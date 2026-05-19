import express, { type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import loginHandler from "../api/auth/login";
import meHandler from "../api/auth/me";
import refreshHandler from "../api/auth/refresh";
import forgotPasswordHandler from "../api/auth/forgot-password";
import dataHandler from "../api/data";
import { loadLocalEnv } from "../api/_lib/env";
import { withRequestPath } from "../api/_lib/render";
import type { RequestLike } from "../api/_lib/types";

const app = express();
const port = Number(process.env.PORT || 3000);
const hmrPort = Number(process.env.HMR_PORT || port + 10000);
const sourceIndexPath = path.resolve(process.cwd(), "index.html");

function queryValue(value: unknown): string | undefined {
  return Array.isArray(value) ? String(value[0]) : typeof value === "string" ? value : undefined;
}

function routeParamPath(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("/");
  return String(value || "");
}

function bindRequest(req: Request, overrides: Record<string, string | undefined> = {}): RequestLike {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query)) {
    query[key] = queryValue(value);
  }
  Object.assign(query, overrides);

  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query,
    on: req.on.bind(req) as RequestLike["on"],
  };
}

async function main(): Promise<void> {
  loadLocalEnv();

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        host: "localhost",
        port: hmrPort,
        clientPort: hmrPort,
      },
      watch: {
        ignored: ["**/dist/**", "**/.git/**", "**/node_modules/**"],
      },
    },
    appType: "custom",
  });

  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.all("/api/token", (req: Request, res: Response) => loginHandler(bindRequest(req), res));
  app.all("/api/token/", (req: Request, res: Response) => loginHandler(bindRequest(req), res));
  app.all("/api/auth/login", (req: Request, res: Response) => loginHandler(bindRequest(req), res));
  app.all("/api/auth/login/", (req: Request, res: Response) => loginHandler(bindRequest(req), res));
  app.all("/api/token/refresh", (req: Request, res: Response) => refreshHandler(bindRequest(req), res));
  app.all("/api/token/refresh/", (req: Request, res: Response) => refreshHandler(bindRequest(req), res));
  app.all("/api/auth/refresh", (req: Request, res: Response) => refreshHandler(bindRequest(req), res));
  app.all("/api/auth/refresh/", (req: Request, res: Response) => refreshHandler(bindRequest(req), res));
  app.all("/api/auth/forgot-password", (req: Request, res: Response) => forgotPasswordHandler(bindRequest(req), res));
  app.all("/api/auth/forgot-password/", (req: Request, res: Response) => forgotPasswordHandler(bindRequest(req), res));
  app.all("/api/me", (req: Request, res: Response) => meHandler(bindRequest(req), res));
  app.all("/api/me/", (req: Request, res: Response) => meHandler(bindRequest(req), res));
  app.all("/api/auth/me", (req: Request, res: Response) => meHandler(bindRequest(req), res));
  app.all("/api/auth/me/", (req: Request, res: Response) => meHandler(bindRequest(req), res));
  app.all("/api/users/me", (req: Request, res: Response) => meHandler(bindRequest(req), res));
  app.all("/api/users/me/", (req: Request, res: Response) => meHandler(bindRequest(req), res));

  app.all("/api/Laundry/*rest", (req: Request, res: Response) => {
    const endpoint = routeParamPath(req.params.rest);
    return dataHandler(bindRequest(req, { app: "laundry", endpoint }), res);
  });

  app.all("/api/Hotel/*rest", (req: Request, res: Response) => {
    const endpoint = routeParamPath(req.params.rest);
    return dataHandler(bindRequest(req, { app: "hotel", endpoint }), res);
  });

  app.all("/api/Report/*rest", (req: Request, res: Response) => {
    const endpoint = routeParamPath(req.params.rest);
    return dataHandler(bindRequest(req, { collection: "reports", endpoint }), res);
  });

  app.use(vite.middlewares);

  app.use(async (req: Request, res: Response) => {
    try {
      const template = await fs.readFile(sourceIndexPath, "utf8");
      const html = await vite.transformIndexHtml(req.originalUrl, withRequestPath(template, req.path));
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      res.status(500).end((error as Error).message);
    }
  });

  app.listen(port, () => {
    console.log(`Local app server running at http://localhost:${port}`);
    console.log(`Vite HMR websocket running on ws://localhost:${hmrPort}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
