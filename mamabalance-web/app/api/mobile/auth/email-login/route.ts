import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function findMobileUserByEmail(email: string) {
  const byPersonalEmail = await adminDb
    .collection("users")
    .where("personalEmail", "==", email)
    .limit(5)
    .get();

  const byLoginEmail = await adminDb
    .collection("users")
    .where("email", "==", email)
    .limit(5)
    .get();

  const candidates = [...byPersonalEmail.docs, ...byLoginEmail.docs];
  return (
    candidates.find((doc) => {
      const data = doc.data();
      return ["mother", "guardian"].includes(String(data.role || "")) && data.status === "active";
    }) ?? null
  );
}

async function verifyPassword(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API key is not configured on the web backend.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const requestedEmail = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    if (!requestedEmail || !password) {
      return NextResponse.json(
        { error: "Please enter your email and password." },
        { status: 400 },
      );
    }

    const userDoc = await findMobileUserByEmail(requestedEmail);
    if (!userDoc) {
      return NextResponse.json(
        { error: "Incorrect email or password. Use your registered personal email, or sign in with your phone number." },
        { status: 401 },
      );
    }

    const user = userDoc.data();
    const authUser = await adminAuth.getUser(userDoc.id);
    const authEmail = normalizeEmail(authUser.email || user.email || requestedEmail);

    const verified =
      (await verifyPassword(authEmail, password)) ||
      (authEmail !== requestedEmail && (await verifyPassword(requestedEmail, password)));

    if (!verified) {
      return NextResponse.json(
        { error: "Incorrect email or password. Use your registered personal email, or sign in with your phone number." },
        { status: 401 },
      );
    }

    const role = String(user.role || "mother").trim().toLowerCase();
    const customToken = await adminAuth.createCustomToken(userDoc.id, {
      role,
      authMethod: "email_password",
    });

    return NextResponse.json({
      ok: true,
      customToken,
      email: requestedEmail,
      role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
