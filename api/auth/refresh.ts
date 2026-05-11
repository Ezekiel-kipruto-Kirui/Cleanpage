import { sendJson, readJson, requireMethod } from "../_lib/http.js";
import { issueAuthTokens, verifyToken } from "../_lib/jwt.js";
import { findUserById, publicUser } from "../_lib/users.js";
import type { RequestLike, ResponseLike } from "../_lib/types.js";

interface RefreshBody {
  refresh?: string;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (!requireMethod(req, res, ["POST"])) return;

  try {
    const { refresh = "" } = await readJson<RefreshBody>(req);
    const payload = verifyToken(refresh, "refresh");
    const user = await findUserById(payload.sub);

    if (!user || !user.is_active) {
      sendJson(res, 401, { detail: "Invalid refresh token" });
      return;
    }

    const tokens = issueAuthTokens(publicUser(user));
    sendJson(res, 200, { access: tokens.access, refresh });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed";
    sendJson(res, 401, { detail: message });
  }
}
