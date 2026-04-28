import { createHash, randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function sanitizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function findActiveMotherByEmail(email: string) {
  const userQueries = [
    adminDb.collection("users").where("personalEmail", "==", email).limit(5).get(),
    adminDb.collection("users").where("email", "==", email).limit(5).get(),
  ];

  for (const query of userQueries) {
    const snapshot = await query;
    const userDoc = snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.role === "mother" && data.status === "active";
    });

    if (userDoc) return userDoc;
  }

  const motherQueries = [
    adminDb.collection("mothers").where("personalEmail", "==", email).limit(5).get(),
    adminDb.collection("mothers").where("email", "==", email).limit(5).get(),
  ];

  for (const query of motherQueries) {
    const snapshot = await query;
    const motherDoc = snapshot.docs[0];
    const userUid = String(
      motherDoc?.data()?.userUid || motherDoc?.data()?.motherId || motherDoc?.id || "",
    );

    if (!userUid) continue;

    const userDoc = await adminDb.collection("users").doc(userUid).get();
    const user = userDoc.data();

    if (userDoc.exists && user?.role === "mother" && user?.status === "active") {
      return userDoc;
    }
  }

  return null;
}

async function assertCooldown(email: string) {
  const snapshot = await adminDb
    .collection("mobileEmailPasswordResetRequests")
    .where("email", "==", email)
    .get();

  if (snapshot.empty) return;

  const latest = snapshot.docs
    .map((doc) => doc.data())
    .reduce((currentLatest, item) => {
      const latestCreatedAtMs = Number(currentLatest.createdAtMs || 0);
      const itemCreatedAtMs = Number(item.createdAtMs || 0);
      return itemCreatedAtMs > latestCreatedAtMs ? item : currentLatest;
    });
  const elapsed = Date.now() - Number(latest.createdAtMs || 0);

  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
    const safeSeconds = Math.max(1, Math.min(remainingSeconds, 60));
    throw new Error(`Please wait ${safeSeconds} seconds before requesting another OTP.`);
  }
}

async function queueEmailOtp({
  email,
  displayName,
  code,
}: {
  email: string;
  displayName: string;
  code: string;
}) {
  await adminDb.collection("mail").add({
    to: [email],
    message: {
      subject: "MamaBalance password reset code",
      text:
        `Hello ${displayName || "MamaBalance mother"},\n\n` +
        `Your MamaBalance password reset code is ${code}.\n` +
        `Use it within 10 minutes to reset your password.\n\n` +
        `If you did not request this, you can ignore this email.`,
    },
    meta: {
      feature: "mobile-mother-email-password-reset",
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function handleSendOtp(request: NextRequest) {
  const payload = (await request.json()) as { email?: string };
  const email = sanitizeEmail(payload.email);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const motherDoc = await findActiveMotherByEmail(email);
  if (!motherDoc) {
    return NextResponse.json(
      { error: "This personal email has not been registered for an active mother account." },
      { status: 404 },
    );
  }

  try {
    await assertCooldown(email);

    const code = createOtpCode();
    const requestId = randomUUID();
    const mother = motherDoc.data();
    const displayName = String(mother.displayName || mother.fullName || "MamaBalance mother");

    await queueEmailOtp({ email, displayName, code });

    await adminDb.collection("mobileEmailPasswordResetRequests").doc(requestId).set({
      uid: motherDoc.id,
      email,
      otpHash: hashValue(code),
      otpAttempts: 0,
      expiresAtMs: Date.now() + OTP_TTL_MS,
      verifiedAtMs: null,
      resetTokenHash: null,
      resetExpiresAtMs: null,
      consumedAtMs: null,
      createdAtMs: Date.now(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, requestId, email });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send OTP right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleVerifyOtp(request: NextRequest) {
  const payload = (await request.json()) as { requestId?: string; otp?: string };
  const requestId = String(payload.requestId || "").trim();
  const otp = String(payload.otp || "").trim();

  if (!requestId || otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });
  }

  const requestRef = adminDb.collection("mobileEmailPasswordResetRequests").doc(requestId);
  const snapshot = await requestRef.get();
  const data = snapshot.data();
  const now = Date.now();

  if (!snapshot.exists || !data || data.consumedAtMs) {
    return NextResponse.json({ error: "OTP request not found. Start again." }, { status: 404 });
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

  const resetToken = randomUUID();
  await requestRef.update({
    verifiedAtMs: now,
    resetTokenHash: hashValue(resetToken),
    resetExpiresAtMs: now + RESET_TTL_MS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    requestId,
    resetToken,
    email: String(data.email || ""),
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

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const requestRef = adminDb.collection("mobileEmailPasswordResetRequests").doc(requestId);
  const snapshot = await requestRef.get();
  const data = snapshot.data();
  const now = Date.now();

  if (!snapshot.exists || !data || data.consumedAtMs) {
    return NextResponse.json({ error: "Reset session not found. Start again." }, { status: 404 });
  }

  if (!data.resetTokenHash || hashValue(resetToken) !== data.resetTokenHash) {
    return NextResponse.json({ error: "Reset session is invalid. Start again." }, { status: 400 });
  }

  if (Number(data.resetExpiresAtMs || 0) < now) {
    return NextResponse.json({ error: "Reset session expired. Request a new OTP." }, { status: 400 });
  }

  const userSnapshot = await adminDb.collection("users").doc(String(data.uid)).get();
  const user = userSnapshot.data();
  if (!userSnapshot.exists || user?.role !== "mother" || user?.status !== "active") {
    return NextResponse.json({ error: "This mother account is not active." }, { status: 400 });
  }

  await adminAuth.updateUser(String(data.uid), { password });
  await requestRef.update({
    consumedAtMs: now,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
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
