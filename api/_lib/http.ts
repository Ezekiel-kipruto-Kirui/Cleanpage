import type { RequestLike, ResponseLike } from "./types.js";

export function sendJson(res: ResponseLike, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function readJson<T>(req: RequestLike): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk: Buffer | string) => {
      raw += chunk.toString();
    });

    req.on("end", () => {
      if (!raw) {
        resolve({} as T);
        return;
      }

      try {
        resolve(JSON.parse(raw) as T);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export function requireMethod(req: RequestLike, res: ResponseLike, methods: string[]): boolean {
  if (req.method && methods.includes(req.method)) return true;

  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { detail: "Method not allowed" });
  return false;
}
