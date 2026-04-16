import { randomInt, randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function sanitizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function createResetToken() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const prefix = local.slice(0, 2);
  const maskedLocal = `${prefix}${"*".repeat(Math.max(local.length - 2, 2))}`;
  return `${maskedLocal}@${domain}`;
}

async function findUserByEmail(submittedEmail: string) {
  let snapshot = await adminDb
    .collection("users")
    .where("personalEmail", "==", submittedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    snapshot = await adminDb
      .collection("users")
      .where("email", "==", submittedEmail)
      .limit(1)
      .get();
  }

  return snapshot.empty ? null : snapshot.docs[0];
}

async function readAuthEmail(uid: string, fallbackEmail: string) {
  try {
    const authUser = await adminAuth.getUser(uid);
    return sanitizeEmail(authUser.email) || fallbackEmail;
  } catch {
    return fallbackEmail;
  }
}

async function handleSendOtp(request: NextRequest) {
  const payload = (await request.json()) as { email?: string };
  const submittedEmail = sanitizeEmail(payload.email);

  if (!submittedEmail || !isValidEmail(submittedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const userDoc = await findUserByEmail(submittedEmail);

  if (!userDoc) {
    return NextResponse.json({
      ok: true,
      requestId: null,
      maskedEmail: maskEmail(submittedEmail),
    });
  }

  const user = userDoc.data();
  const loginEmail = await readAuthEmail(userDoc.id, sanitizeEmail(user.email));
  const deliveryEmail = sanitizeEmail(user.personalEmail) || loginEmail;
  const displayName = String(user.displayName || "MamaBalance user").trim();

  if (!deliveryEmail || !loginEmail) {
    return NextResponse.json({ ok: true, requestId: null, maskedEmail: maskEmail(submittedEmail) });
  }

  const code = createOtpCode();
  const requestId = randomUUID();
  const now = Date.now();

  await adminDb.collection("passwordResetRequests").doc(requestId).set({
    uid: userDoc.id,
    submittedEmail,
    deliveryEmail,
    loginEmail,
    displayName,
    otpHash: hashValue(code),
    otpAttempts: 0,
    expiresAtMs: now + OTP_TTL_MS,
    verifiedAtMs: null,
    resetTokenHash: null,
    resetTokenExpiresAtMs: null,
    consumedAtMs: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("mail").add({
    to: [deliveryEmail],
    message: {
      subject: "MamaBalance password reset OTP",
      text:
        `Hello ${displayName},\n\n` +
        `Use this OTP to reset your MamaBalance password: ${code}\n\n` +
        "This OTP expires in 10 minutes.\n\n" +
        `Account login email: ${loginEmail}\n\n` +
        "If you did not request this reset, you can ignore this email.",
    },
    meta: {
      feature: "password-reset-otp",
      requestId,
      userUid: userDoc.id,
      loginEmail,
      deliveryEmail,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    requestId,
    maskedEmail: maskEmail(deliveryEmail),
  });
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
