import { sendJson, readJson, requireMethod } from "../_lib/http";
import { issueAuthTokens } from "../_lib/jwt";
import { verifyPassword } from "../_lib/password";
import { findAuthUserByEmail, publicUser } from "../_lib/users";
import type { RequestLike, ResponseLike } from "../_lib/types";

interface LoginBody {
  email?: string;
  password?: string;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (!requireMethod(req, res, ["POST"])) return;

  try {
    const { email = "", password = "" } = await readJson<LoginBody>(req);
    const user = await findAuthUserByEmail(email);
    const storedPassword = user?.password_hash || user?.password;

    if (!user || !user.is_active || !verifyPassword(password, storedPassword)) {
      sendJson(res, 401, { detail: "Invalid email or password" });
      return;
    }

    const tokens = issueAuthTokens(publicUser(user));
    sendJson(res, 200, {
      ...tokens,
      user: publicUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    sendJson(res, 500, { detail: message });
  }
}
