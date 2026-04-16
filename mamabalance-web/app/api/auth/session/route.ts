import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "@/lib/auth/constants";
import { StaffRole, isStaffRole, roleHomePath } from "@/lib/auth/types";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function readStaffRole(uid: string): Promise<StaffRole | null> {
  const snapshot = await adminDb.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data?.role || data.status !== "active" || !isStaffRole(data.role)) {
    return null;
  }

  return data.role;
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token." }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const role = await readStaffRole(decodedToken.uid);

    if (!role) {
      return NextResponse.json(
        { error: "This account is not an active staff account." },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({
      redirectPath: roleHomePath(role),
      role,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to create the secure session." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
