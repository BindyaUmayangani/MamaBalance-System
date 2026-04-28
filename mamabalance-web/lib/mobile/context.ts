import { NextRequest, NextResponse } from "next/server";
import { type DocumentData } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

export type MobileRole = "mother" | "guardian";

export type MobileContext = {
  authUid: string;
  role: MobileRole;
  userDocId: string;
  user: DocumentData;
  motherDocId: string;
  mother: DocumentData;
  guardianLink?: DocumentData | null;
};

export function readString(value: unknown, fallback = "") {
  const raw = String(value || "").trim();
  return raw || fallback;
}

export function toIso(value: unknown) {
  const timestamp = value as { toDate?: () => Date };
  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : value instanceof Date
        ? value
        : value
          ? new Date(String(value))
          : null;

  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

async function verifyMobileRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) throw new Error("Please sign in to continue.");
  return adminAuth.verifyIdToken(token);
}

async function findUserDoc(decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>) {
  const direct = await adminDb.collection("users").doc(decoded.uid).get();
  if (direct.exists) return direct;

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb.collection("users").where("phoneNumber", "==", phone).limit(1).get();
    if (!byPhone.empty) return byPhone.docs[0];
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byEmail = await adminDb.collection("users").where("email", "==", email).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0];
    const byPersonalEmail = await adminDb.collection("users").where("personalEmail", "==", email).limit(1).get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }
  return null;
}

async function findMotherDoc(role: MobileRole, userDocId: string, decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>) {
  if (role === "guardian") {
    const byGuardianUid = await adminDb.collection("mothers").where("guardianUid", "==", userDocId).limit(1).get();
    if (!byGuardianUid.empty) return { motherDoc: byGuardianUid.docs[0], guardianLink: null };

    const phone = readString(decoded.phone_number);
    if (phone) {
      const byContact = await adminDb.collection("mothers").where("guardianContact", "==", phone).limit(1).get();
      if (!byContact.empty) return { motherDoc: byContact.docs[0], guardianLink: null };
    }

    const link = await adminDb
      .collection("guardianLinks")
      .where("guardianUid", "==", userDocId)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    const guardianLink = link.docs[0]?.data() || null;
    const motherId = readString(guardianLink?.motherId);
    if (motherId) {
      const motherDoc = await adminDb.collection("mothers").doc(motherId).get();
      if (motherDoc.exists) return { motherDoc, guardianLink };
    }
    return null;
  }

  const direct = await adminDb.collection("mothers").doc(userDocId).get();
  if (direct.exists) return { motherDoc: direct, guardianLink: null };
  const byUserUid = await adminDb.collection("mothers").where("userUid", "==", userDocId).limit(1).get();
  if (!byUserUid.empty) return { motherDoc: byUserUid.docs[0], guardianLink: null };

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb.collection("mothers").where("phoneNumber", "==", phone).limit(1).get();
    if (!byPhone.empty) return { motherDoc: byPhone.docs[0], guardianLink: null };
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byPersonalEmail = await adminDb.collection("mothers").where("personalEmail", "==", email).limit(1).get();
    if (!byPersonalEmail.empty) return { motherDoc: byPersonalEmail.docs[0], guardianLink: null };
  }
  return null;
}

export async function resolveMobileContext(request: NextRequest): Promise<MobileContext | NextResponse> {
  const decoded = await verifyMobileRequest(request);
  const userDoc = await findUserDoc(decoded);
  if (!userDoc?.exists) {
    return NextResponse.json({ error: "This account has not been registered in MamaBalance yet." }, { status: 404 });
  }

  const user = userDoc.data() || {};
  const role = readString(user.role).toLowerCase() as MobileRole;
  if (!["mother", "guardian"].includes(role)) {
    return NextResponse.json({ error: "This sign-in page is only for mothers and guardians." }, { status: 403 });
  }
  if (readString(user.status).toLowerCase() !== "active") {
    return NextResponse.json({ error: "Your account is not active yet. Please contact your care team." }, { status: 403 });
  }

  const resolvedMother = await findMotherDoc(role, userDoc.id, decoded);
  if (!resolvedMother?.motherDoc.exists) {
    return NextResponse.json({ error: "Unable to find your linked mother profile." }, { status: 404 });
  }

  return {
    authUid: decoded.uid,
    role,
    userDocId: userDoc.id,
    user,
    motherDocId: resolvedMother.motherDoc.id,
    mother: resolvedMother.motherDoc.data() || {},
    guardianLink: resolvedMother.guardianLink,
  };
}
