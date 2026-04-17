function requireNotifyConfig() {
  const userId = process.env.NOTIFY_LK_USER_ID;
  const apiKey = process.env.NOTIFY_LK_API_KEY;
  const senderId = process.env.NOTIFY_LK_SENDER_ID;

  if (!userId || !apiKey || !senderId) {
    throw new Error(
      "Missing Notify.lk credentials. Add NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, and NOTIFY_LK_SENDER_ID.",
    );
  }

  return { userId, apiKey, senderId };
}

export function normalizePhoneNumber(value: unknown) {
  const cleaned = String(value || "").trim().replace(/[\s()-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("94")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+94${cleaned.slice(1)}`;
  return cleaned;
}

export function maskPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return "";
  }

  const visibleSuffix = normalized.slice(-2);
  const hiddenLength = Math.max(normalized.length - 5, 4);
  return `${normalized.slice(0, 3)}${"*".repeat(hiddenLength)}${visibleSuffix}`;
}

function notifyPhoneNumber(value: string) {
  return value.replace(/^\+/, "");
}

export async function sendNotifySms({
  phoneNumber,
  message,
  contactFirstName,
  unicode = false,
}: {
  phoneNumber: string;
  message: string;
  contactFirstName?: string;
  unicode?: boolean;
}) {
  const { userId, apiKey, senderId } = requireNotifyConfig();
  const params = new URLSearchParams({
    user_id: userId,
    api_key: apiKey,
    sender_id: senderId,
    to: notifyPhoneNumber(normalizePhoneNumber(phoneNumber)),
    message,
  });

  if (contactFirstName) {
    params.set("contact_fname", contactFirstName);
  }

  if (unicode) {
    params.set("type", "unicode");
  }

  const response = await fetch(`https://app.notify.lk/api/v1/send?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; data?: unknown }
    | null;

  if (!response.ok || payload?.status !== "success") {
    const reason =
      payload && typeof payload.data === "string"
        ? payload.data
        : "Notify.lk SMS request failed.";
    throw new Error(reason);
  }
}
