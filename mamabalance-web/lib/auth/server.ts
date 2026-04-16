import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  StaffRole,
  UserProfile,
  isStaffRole,
  roleHomePath,
} from "@/lib/auth/types";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function readUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await adminDb.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data?.role || !data?.status) {
    return null;
  }

  return {
    uid,
    role: data.role,
    status: data.status,
    email: data.email ?? null,
    personalEmail: data.personalEmail ?? null,
    phoneNumber: data.phoneNumber ?? null,
    displayName: data.displayName ?? null,
    username: data.username ?? null,
    regionId: data.regionId ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
  } as UserProfile;
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const profile = await readUserProfile(decodedToken.uid);

    if (!profile || profile.status !== "active" || !isStaffRole(profile.role)) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

export async function requireStaffSession(allowedRoles: StaffRole[]) {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(roleHomePath(user.role));
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect(roleHomePath(user.role));
  }
}
