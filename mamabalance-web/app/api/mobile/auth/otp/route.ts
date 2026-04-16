import { createHash, randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizePhoneNumber(value: unknown) {
  const cleaned = String(value || "").trim().replace(/[\s()-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("94")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+94${cleaned.slice(1)}`;
  return cleaned;
}

function notifyPhoneNumber(value: string) {
  return value.replace(/^\+/, "");
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

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

async function findMotherByPhone(phoneNumber: string) {
  const snapshot = await adminDb
    .collection("users")
    .where("phoneNumber", "==", phoneNumber)
    .limit(5)
    .get();

  if (snapshot.empty) return null;

  return (
    snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.role === "mother" && data.status === "active";
    }) ?? null
  );
}

async function assertCooldown(phoneNumber: string) {
  const snapshot = await adminDb
    .collection("mobileOtpRequests")
    .where("phoneNumber", "==", phoneNumber)
    .get();

  if (snapshot.empty) return;

  const latest = snapshot.docs
    .map((doc) => doc.data())
    .reduce((currentLatest, item) => {
      const latestCreatedAtMs = Number(currentLatest.createdAtMs || 0);
      const itemCreatedAtMs = Number(item.createdAtMs || 0);
      return itemCreatedAtMs > latestCreatedAtMs ? item : currentLatest;
    });
  const createdAtMs = Number(latest.createdAtMs || 0);
  const elapsed = Date.now() - createdAtMs;

  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
    const safeSeconds = Math.max(1, Math.min(remainingSeconds, 60));
    throw new Error(
      `Please wait ${safeSeconds} seconds before requesting another OTP.`,
    );
  }
}

async function sendSmsOtp({
  phoneNumber,
  code,
  displayName,
}: {
  phoneNumber: string;
  code: string;
  displayName: string;
}) {
  const { userId, apiKey, senderId } = requireNotifyConfig();
  const params = new URLSearchParams({
    user_id: userId,
    api_key: apiKey,
    sender_id: senderId,
    to: notifyPhoneNumber(phoneNumber),
    message:
      `MamaBalance: Your verification code is ${code}. ` +
      `Use it within 10 minutes to continue.`,
    contact_fname: displayName.split(" ").filter(Boolean)[0] || "Mother",
  });

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

async function handleSendOtp(request: NextRequest) {
  const payload = (await request.json()) as {
    phoneNumber?: string;
    purpose?: string;
  };

  const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
  const purpose = String(payload.purpose || "login").trim().toLowerCase();

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Please enter your phone number." }, { status: 400 });
  }

  if (!["login", "forgot-password"].includes(purpose)) {
    return NextResponse.json({ error: "Unsupported OTP purpose." }, { status: 400 });
  }

  const motherDoc = await findMotherByPhone(normalizedPhone);
  if (!motherDoc) {
    return NextResponse.json(
      { error: "This phone number has not been registered in MamaBalance yet." },
      { status: 404 },
    );
  }

  try {
    await assertCooldown(normalizedPhone);
    const code = createOtpCode();
    const requestId = randomUUID();
    const mother = motherDoc.data();
    const displayName = String(mother.displayName || "Mother").trim();

    await sendSmsOtp({
      phoneNumber: normalizedPhone,
      code,
      displayName,
    });

    await adminDb.collection("mobileOtpRequests").doc(requestId).set({
      uid: motherDoc.id,
      phoneNumber: normalizedPhone,
      purpose,
      otpHash: hashValue(code),
      otpAttempts: 0,
      expiresAtMs: Date.now() + OTP_TTL_MS,
      consumedAtMs: null,
      createdAtMs: Date.now(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      requestId,
      phoneNumber: normalizedPhone,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send OTP right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleVerifyOtp(request: NextRequest) {
  const payload = (await request.json()) as {
    requestId?: string;
    otp?: string;
  };

  const requestId = String(payload.requestId || "").trim();
  const otp = String(payload.otp || "").trim();

  if (!requestId || otp.length != 6) {
    return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });
  }

  const requestRef = adminDb.collection("mobileOtpRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    return NextResponse.json({ error: "OTP request not found. Start again." }, { status: 404 });
  }

  const data = requestSnapshot.data();
  const now = Date.now();

  if (!data || data.consumedAtMs) {
    return NextResponse.json({ error: "This OTP request is no longer available." }, { status: 400 });
  }

  if (Number(data.expiresAtMs || 0) < now) {
    return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
  }

  if (Number(data.otpAttempts || 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect OTP attempts. Request a new code." },
      { status: 400 },
    );
  }

  if (hashValue(otp) !== data.otpHash) {
    await requestRef.update({
      otpAttempts: Number(data.otpAttempts || 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
  }

  const userSnapshot = await adminDb.collection("users").doc(String(data.uid)).get();
  const user = userSnapshot.data();

  if (!userSnapshot.exists || user?.role !== "mother" || user?.status !== "active") {
    return NextResponse.json({ error: "This mother account is not active." }, { status: 400 });
  }

  const customToken = await adminAuth.createCustomToken(String(data.uid), {
    role: "mother",
    authMethod: "sms_otp",
  });

  await requestRef.update({
    consumedAtMs: now,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    customToken,
    phoneNumber: String(data.phoneNumber || ""),
    purpose: String(data.purpose || "login"),
  });
}

export async function POST(request: NextRequest) {
  return handleSendOtp(request);
}

export async function PATCH(request: NextRequest) {
  return handleVerifyOtp(request);
}
