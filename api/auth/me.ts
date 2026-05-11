import { sendJson, requireMethod } from "../_lib/http";
import { bearerToken, verifyToken } from "../_lib/jwt";
import { findUserById, publicUser } from "../_lib/users";
import type { RequestLike, ResponseLike } from "../_lib/types";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (!requireMethod(req, res, ["GET"])) return;

  try {
    const payload = verifyToken(bearerToken(req), "access");
    const user = await findUserById(payload.sub);

    if (!user || !user.is_active) {
      sendJson(res, 401, { detail: "Unauthorized" });
      return;
    }

    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    sendJson(res, 401, { detail: message });
  }
}
