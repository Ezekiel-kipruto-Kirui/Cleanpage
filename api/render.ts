import fs from "node:fs/promises";
import path from "node:path";
import { withRequestPath } from "./_lib/render.js";
import type { RequestLike, ResponseLike } from "./_lib/types.js";

const DIST_INDEX = path.join(process.cwd(), "dist", "index.html");
const SOURCE_INDEX = path.join(process.cwd(), "index.html");

async function readHtmlTemplate(): Promise<string> {
  try {
    return await fs.readFile(DIST_INDEX, "utf8");
  } catch {
    return fs.readFile(SOURCE_INDEX, "utf8");
  }
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "/";
    const html = await readHtmlTemplate();

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(withRequestPath(html, pathname));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Failed to render app shell: ${message}`);
  }
}
