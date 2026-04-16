import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

function sanitizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string };
    const submittedEmail = sanitizeEmail(payload.email);

    if (!submittedEmail || !isValidEmail(submittedEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    let userSnapshot = await adminDb
      .collection("users")
      .where("personalEmail", "==", submittedEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      userSnapshot = await adminDb
        .collection("users")
        .where("email", "==", submittedEmail)
        .limit(1)
        .get();
    }

    if (userSnapshot.empty) {
      return NextResponse.json({ ok: true });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();
    const loginEmail = sanitizeEmail(user.email);
    const deliveryEmail = sanitizeEmail(user.personalEmail) || loginEmail;
    const displayName = String(user.displayName || "MamaBalance user").trim();

    if (!loginEmail || !deliveryEmail) {
      return NextResponse.json({ ok: true });
    }

    const resetLink = await adminAuth.generatePasswordResetLink(loginEmail);

    await adminDb.collection("mail").add({
      to: [deliveryEmail],
      message: {
        subject: "MamaBalance password reset",
        text:
          `Hello ${displayName},\n\n` +
          "We received a request to reset your MamaBalance password.\n\n" +
          `Use this secure link to choose a new password:\n${resetLink}\n\n` +
          `This reset link is for your MamaBalance login account: ${loginEmail}\n\n` +
          "If you did not request this change, you can ignore this email.",
      },
      meta: {
        feature: "forgot-password",
        userUid: userDoc.id,
        loginEmail,
        deliveryEmail,
        submittedEmail,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send the password reset email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
