import { randomInt, randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { STAFF_ROLES } from "@/lib/auth/types";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { maskPhoneNumber, normalizePhoneNumber, sendNotifySms } from "@/lib/notify/sms";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function createResetToken() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

function sanitizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function buildPhoneLookupVariants(phoneNumber: string) {
  const normalized = normalizePhoneNumber(phoneNumber);
  const variants = new Set<string>();

  if (normalized) {
    variants.add(normalized);
  }

  if (normalized.startsWith("+")) {
    variants.add(normalized.slice(1));
  }

  if (normalized.startsWith("+94")) {
    variants.add(`0${normalized.slice(3)}`);
  }

  return Array.from(variants).slice(0, 10);
}

async function findStaffByPhone(phoneNumber: string) {
  const variants = buildPhoneLookupVariants(phoneNumber);

  if (variants.length === 0) {
    return null;
  }

  const snapshot = await adminDb
    .collection("users")
    .where("phoneNumber", "in", variants)
    .limit(10)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const matchingDocs = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return STAFF_ROLES.includes(data.role) && data.status === "active";
  });

  if (matchingDocs.length !== 1) {
    return null;
  }

  return matchingDocs[0];
}

async function readAuthEmail(uid: string, fallbackEmail: string) {
  try {
    const authUser = await adminAuth.getUser(uid);
    return sanitizeEmail(authUser.email) || fallbackEmail;
  } catch {
    return fallbackEmail;
  }
}

async function assertCooldown(uid: string) {
  const snapshot = await adminDb
    .collection("passwordResetRequests")
    .where("uid", "==", uid)
    .get();

  if (snapshot.empty) {
    return;
  }

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
    throw new Error(`Please wait ${safeSeconds} seconds before requesting another OTP.`);
  }
}

async function handleSendOtp(request: NextRequest) {
  const payload = (await request.json()) as { phoneNumber?: string };
  const submittedPhoneNumber = normalizePhoneNumber(payload.phoneNumber);

  if (!submittedPhoneNumber) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  const userDoc = await findStaffByPhone(submittedPhoneNumber);

  if (!userDoc) {
    return NextResponse.json({
      ok: true,
      requestId: null,
      maskedPhone: maskPhoneNumber(submittedPhoneNumber),
    });
  }

  const user = userDoc.data();
  const loginEmail = await readAuthEmail(userDoc.id, sanitizeEmail(user.email));
  const deliveryPhone = normalizePhoneNumber(user.phoneNumber);
  const displayName = String(user.displayName || "MamaBalance user").trim();

  if (!deliveryPhone || !loginEmail) {
    return NextResponse.json({
      ok: true,
      requestId: null,
      maskedPhone: maskPhoneNumber(submittedPhoneNumber),
    });
  }

  try {
    await assertCooldown(userDoc.id);

    const code = createOtpCode();
    const requestId = randomUUID();
    const now = Date.now();

    await sendNotifySms({
      phoneNumber: deliveryPhone,
      message:
        `MamaBalance: Your staff password reset code is ${code}. ` +
        "Use it within 10 minutes.",
      contactFirstName: displayName.split(" ").filter(Boolean)[0] || "Staff",
    });

    await adminDb.collection("passwordResetRequests").doc(requestId).set({
      uid: userDoc.id,
      submittedPhoneNumber,
      deliveryPhone,
      loginEmail,
      displayName,
      otpHash: hashValue(code),
      otpAttempts: 0,
      expiresAtMs: now + OTP_TTL_MS,
      verifiedAtMs: null,
      resetTokenHash: null,
      resetTokenExpiresAtMs: null,
      consumedAtMs: null,
      createdAtMs: now,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      requestId,
      maskedPhone: maskPhoneNumber(deliveryPhone),
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

  if (!requestId || otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });
  }

  const requestRef = adminDb.collection("passwordResetRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    return NextResponse.json({ error: "OTP request not found. Start again." }, { status: 404 });
  }

  const data = requestSnapshot.data();
  const now = Date.now();

  if (!data || data.consumedAtMs) {
    return NextResponse.json({ error: "This reset request is no longer available." }, { status: 400 });
  }

  if (Number(data.expiresAtMs || 0) < now) {
    return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
  }

  if (Number(data.otpAttempts || 0) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect OTP attempts. Request a new code." }, { status: 400 });
  }

  if (hashValue(otp) !== data.otpHash) {
    await requestRef.update({
      otpAttempts: Number(data.otpAttempts || 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
  }

  const resetToken = createResetToken();

  await requestRef.update({
    verifiedAtMs: now,
    resetTokenHash: hashValue(resetToken),
    resetTokenExpiresAtMs: now + VERIFIED_TTL_MS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    resetToken,
  });
}

async function handleResetPassword(request: NextRequest) {
  const payload = (await request.json()) as {
    requestId?: string;
    resetToken?: string;
    password?: string;
    confirmPassword?: string;
  };

  const requestId = String(payload.requestId || "").trim();
  const resetToken = String(payload.resetToken || "").trim();
  const password = String(payload.password || "");
  const confirmPassword = String(payload.confirmPassword || "");

  if (!requestId || !resetToken) {
    return NextResponse.json({ error: "Reset session expired. Start again." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const requestRef = adminDb.collection("passwordResetRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    return NextResponse.json({ error: "Reset session not found. Start again." }, { status: 404 });
  }

  const data = requestSnapshot.data();
  const now = Date.now();

  if (
    !data ||
    !data.uid ||
    data.consumedAtMs ||
    !data.verifiedAtMs ||
    !data.resetTokenHash ||
    hashValue(resetToken) !== data.resetTokenHash ||
    Number(data.resetTokenExpiresAtMs || 0) < now
  ) {
    return NextResponse.json({ error: "Reset session expired. Request a new OTP." }, { status: 400 });
  }

  await adminAuth.updateUser(String(data.uid), {
    password,
  });
  await adminAuth.revokeRefreshTokens(String(data.uid));

  await adminDb.collection("users").doc(String(data.uid)).update({
    updatedAt: FieldValue.serverTimestamp(),
    passwordResetAt: FieldValue.serverTimestamp(),
    passwordResetByUid: null,
  });

  await requestRef.update({
    consumedAtMs: now,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const authUser = await adminAuth.getUser(String(data.uid));

  return NextResponse.json({
    ok: true,
    loginEmail: sanitizeEmail(authUser.email) || String(data.loginEmail || ""),
  });
}

export async function POST(request: NextRequest) {
  return handleSendOtp(request);
}

export async function PATCH(request: NextRequest) {
  return handleVerifyOtp(request);
}

export async function PUT(request: NextRequest) {
  return handleResetPassword(request);
}
