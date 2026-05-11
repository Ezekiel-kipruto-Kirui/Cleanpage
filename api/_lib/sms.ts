import { optionalEnv } from "./env.js";

const DEFAULT_SMS_BASE_URL = "https://api.v2.emalify.com";

type SmsSuccess = {
  success: true;
  type: "single" | "bulk";
  response: string;
  recipients: string[];
};

type SmsFailure = {
  success: false;
  error: string;
  details: string;
};

export type SmsResult = SmsSuccess | SmsFailure;

function smsConfig() {
  return {
    apiKey: optionalEnv("ROAMTECH_API_KEY"),
    partnerId: optionalEnv("ROAMTECH_PARTNER_ID"),
    shortcode: optionalEnv("SHORTCODE"),
    baseUrl: (optionalEnv("SMS_BASE_URL") || DEFAULT_SMS_BASE_URL).replace(/\/$/, ""),
    notificationsEnabled: optionalEnv("SMS_NOTIFICATIONS_ENABLED") !== "false",
  };
}

function normalizePhoneForSms(phone: string): string {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+254") && cleaned.length === 13) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `254${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("7") && cleaned.length === 9) {
    return `254${cleaned}`;
  }

  return cleaned.replace(/^\+/, "");
}

export function normalizeSmsRecipients(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = normalizePhoneForSms(String(value || ""));
    if (normalized) unique.add(normalized);
  }

  return Array.from(unique);
}

export function smsIsConfigured(): boolean {
  const config = smsConfig();
  return Boolean(config.apiKey && config.partnerId && config.shortcode);
}

export async function sendSms(recipientsInput: unknown, messageInput: unknown): Promise<SmsResult> {
  const recipients = normalizeSmsRecipients(recipientsInput);
  const message = String(messageInput || "").trim();

  if (!recipients.length) {
    return { success: false, error: "Validation failed", details: "No valid phone numbers were provided." };
  }

  if (!message) {
    return { success: false, error: "Validation failed", details: "Message is required." };
  }

  const config = smsConfig();
  if (!config.notificationsEnabled) {
    return { success: false, error: "SMS disabled", details: "SMS_NOTIFICATIONS_ENABLED is false." };
  }

  if (!config.apiKey || !config.partnerId || !config.shortcode) {
    return {
      success: false,
      error: "SMS not configured",
      details: "Set ROAMTECH_API_KEY, ROAMTECH_PARTNER_ID, and SHORTCODE in the environment.",
    };
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    if (recipients.length === 1) {
      const response = await fetch(`${config.baseUrl}/api/services/sendsms/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          apikey: config.apiKey,
          partnerID: config.partnerId,
          mobile: recipients[0],
          message,
          shortcode: config.shortcode,
          pass_type: "plain",
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        return {
          success: false,
          error: "Failed to send SMS",
          details: responseText || `SMS provider error ${response.status}`,
        };
      }

      return {
        success: true,
        type: "single",
        response: responseText || "SMS sent successfully.",
        recipients,
      };
    }

    const smslist = recipients.map((mobile) => ({
      partnerID: config.partnerId,
      apikey: config.apiKey,
      pass_type: "plain",
      clientsmsid: crypto.randomUUID(),
      mobile,
      message,
      shortcode: config.shortcode,
    }));

    const response = await fetch(`${config.baseUrl}/api/services/sendbulk/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        count: smslist.length,
        smslist,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return {
        success: false,
        error: "Failed to send SMS",
        details: responseText || `SMS provider error ${response.status}`,
      };
    }

    return {
      success: true,
      type: "bulk",
      response: responseText || "Bulk SMS sent successfully.",
      recipients,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to send SMS",
      details: error instanceof Error ? error.message : "Unknown SMS error",
    };
  }
}
