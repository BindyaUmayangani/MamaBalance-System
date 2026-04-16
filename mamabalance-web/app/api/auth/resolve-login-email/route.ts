import { NextRequest, NextResponse } from "next/server";

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

    if (snapshot.empty) {
      return NextResponse.json({ loginEmail: submittedEmail });
    }

    const userDoc = snapshot.docs[0];
    const data = userDoc.data();

    try {
      const authUser = await adminAuth.getUser(userDoc.id);
      const authEmail = sanitizeEmail(authUser.email);

      if (authEmail) {
        return NextResponse.json({ loginEmail: authEmail });
      }
    } catch {
      // Fall back to the Firestore copy if the auth lookup is unavailable.
    }

    return NextResponse.json({
      loginEmail: sanitizeEmail(data.email) || submittedEmail,
    });
  } catch {
    return NextResponse.json({ loginEmail: "" }, { status: 500 });
  }
}
