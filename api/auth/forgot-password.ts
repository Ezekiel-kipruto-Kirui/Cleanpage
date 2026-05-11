import { sendJson, readJson, requireMethod } from "../_lib/http.js";
import { findAuthUserByEmail } from "../_lib/users.js";
import { firebasePut } from "../_lib/firebase.js";
import type { RequestLike, ResponseLike } from "../_lib/types.js";

interface ForgotPasswordBody {
  email?: string;
}

const GENERIC_MESSAGE =
  "If an account with that email exists, a password reset request has been recorded. Please contact your administrator to complete the reset.";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (!requireMethod(req, res, ["POST"])) return;

  try {
    const { email = "" } = await readJson<ForgotPasswordBody>(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      sendJson(res, 400, { detail: "Email is required." });
      return;
    }

    const user = await findAuthUserByEmail(normalizedEmail).catch(() => null);
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await firebasePut(`password_reset_requests/${requestId}`, {
      id: requestId,
      email: normalizedEmail,
      user_id: user?.id ?? null,
      status: "pending",
      created_at: new Date().toISOString(),
    }).catch(() => null);

    sendJson(res, 200, { detail: GENERIC_MESSAGE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset request failed";
    sendJson(res, 500, { detail: message });
  }
}
