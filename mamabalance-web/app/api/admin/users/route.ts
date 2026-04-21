import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import {
  buildRoleUserId,
  buildSystemEmail,
  buildSystemUsername,
  buildTemporaryPassword,
  buildUserCode,
  formatDate,
} from "@/lib/admin/format";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { logAuditEvent } from "@/lib/audit/log";
import {
  CreatedCredentials,
  GuardianProvisioning,
  ManagedMotherRow,
  ManagedRole,
  ManagedUserRow,
  MotherCreatePayload,
  RegionOption,
  StaffCreatePayload,
} from "@/lib/admin/types";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendNotifySms } from "@/lib/notify/sms";

const MANAGED_ROLES: ManagedRole[] = [
  "regionaladmin",
  "doctor",
  "midwife",
  "mother",
];

function getRegionMap(options: RegionOption[]) {
  return new Map(options.map((region) => [region.id, region.name]));
}

async function loadRegions() {
  const snapshot = await adminDb.collection("regions").get();

  if (snapshot.empty) {
    return DEFAULT_REGIONS;
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data().name as string | undefined) || doc.id,
  }));
}

function assertManageableRole(value: string | null): value is ManagedRole {
  return value !== null && MANAGED_ROLES.includes(value as ManagedRole);
}

function isAllowedToCreate(actorRole: string, targetRole: ManagedRole) {
  if (actorRole === "superadmin") {
    return true;
  }

  if (actorRole === "regionaladmin") {
    return targetRole !== "regionaladmin";
  }

  return false;
}

function isAllowedToManage(actorRole: string, targetRole: ManagedRole) {
  return isAllowedToCreate(actorRole, targetRole);
}

function calculateAge(value: unknown) {
  if (!value) return "-";

  const birthdate = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(birthdate.getTime())) {
    return "-";
  }

  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDelta = today.getMonth() - birthdate.getMonth();
  const hasHadBirthday =
    monthDelta > 0 ||
    (monthDelta === 0 && today.getDate() >= birthdate.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "-";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhoneNumber(value: string) {
  const cleaned = value.trim().replace(/[\s()-]/g, "");

  if (!cleaned) {
    return "";
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("94")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }

  return cleaned;
}

function formatDateTime(value: unknown) {
  if (!value) return "-";

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function resolveLatestEpdsAttemptDate(mother: DocumentData | undefined, user: DocumentData) {
  return (
    mother?.latestEpdsSubmittedAt ??
    mother?.latestEpdsAttemptedAt ??
    mother?.latestEpdsCreatedAt ??
    mother?.updatedAt ??
    user.updatedAt ??
    mother?.createdAt ??
    user.createdAt
  );
}

function buildStaffRow(user: DocumentData, regionMap: Map<string, string>, uid: string): ManagedUserRow {
  return {
    uid,
    userId: (user.userId as string | undefined) || buildUserCode("US", uid),
    name: (user.displayName as string | undefined) || "-",
    username: (user.username as string | undefined) || "-",
    email: (user.email as string | undefined) || "-",
    personalEmail: (user.personalEmail as string | undefined) || "-",
    nic: (user.nic as string | undefined) || "-",
    region: normalizeRegionName(regionMap.get(user.regionId as string) || (user.regionName as string | undefined)),
    contact: (user.phoneNumber as string | undefined) || "-",
    createdOn: formatDate(user.createdAt?.toDate?.() ?? user.createdAt),
    status: user.status === "active" ? "active" : "inactive",
    role: user.role as ManagedRole,
  };
}

function buildMotherRow(
  user: DocumentData,
  mother: DocumentData | undefined,
  regionMap: Map<string, string>,
  staffMap: Map<string, string>,
  uid: string,
): ManagedMotherRow {
  return {
    uid,
    userId: (user.userId as string | undefined) || buildUserCode("MO", uid),
    name: (user.displayName as string | undefined) || "-",
    username: (user.username as string | undefined) || "-",
    email: (user.email as string | undefined) || "-",
    personalEmail: (user.personalEmail as string | undefined) || (mother?.personalEmail as string | undefined) || "-",
    nic: (mother?.nic as string | undefined) || (user.nic as string | undefined) || "-",
    region: normalizeRegionName(regionMap.get((user.regionId as string | undefined) || (mother?.regionId as string | undefined)) || user.regionName || mother?.regionName),
    contact: (user.phoneNumber as string | undefined) || "-",
    createdOn: formatDate(user.createdAt?.toDate?.() ?? user.createdAt),
    status: user.status === "active" ? "active" : "inactive",
    role: "mother",
    riskStatus: (mother?.riskLevel as string | undefined) || "low",
    assignedMidwife: staffMap.get(mother?.assignedMidwifeUid as string) || "-",
    assignedDoctor: staffMap.get(mother?.assignedDoctorUid as string) || "-",
    lastEpdScore: Number(mother?.latestEpdsScore ?? 0),
    lastEpdTestDate:
      Number(mother?.latestEpdsScore ?? 0) > 0
        ? formatDateTime(resolveLatestEpdsAttemptDate(mother, user))
        : "-",
    age: calculateAge(mother?.birthdate),
    birthdate: formatDate(mother?.birthdate),
    address: (mother?.address as string | undefined) || "-",
    guardianName: (mother?.guardianName as string | undefined) || "-",
    guardianContact: (mother?.guardianContact as string | undefined) || "-",
    guardianAccessEnabled: Boolean(mother?.guardianUid),
    deliveryDate: formatDate(mother?.deliveryDate),
    noOfChildren: Number(mother?.noOfChildren ?? 0),
  };
}

async function fetchStaffNameMap() {
  const snapshot = await adminDb
    .collection("users")
    .where("role", "in", ["doctor", "midwife", "regionaladmin", "superadmin"])
    .get();

  return new Map(
    snapshot.docs.map((doc) => [
      doc.id,
      ((doc.data().displayName as string | undefined) || doc.id) as string,
    ]),
  );
}

async function queueCredentialsEmail(
  fullName: string,
  deliveryEmail: string,
  credentials: CreatedCredentials,
) {
  try {
    await adminDb.collection("mail").add({
      to: [deliveryEmail],
      message: {
        subject: "MamaBalance login credentials",
        text:
          `Hello ${fullName},\n\n` +
          `Your MamaBalance account is ready.\n\n` +
          `User ID: ${credentials.userId}\n` +
          `Username: ${credentials.username}\n` +
          `Login email: ${credentials.loginEmail}\n` +
          `Temporary password: ${credentials.temporaryPassword}\n\n` +
          `Please sign in and change your password after your first login.`,
      },
      meta: {
        feature: "user-management-credentials",
        userId: credentials.userId,
        username: credentials.username,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return true;
  } catch {
    return false;
  }
}

async function createStaffAccount(
  payload: StaffCreatePayload,
  actor: Awaited<ReturnType<typeof getCurrentSessionUser>>,
) {
  const loginEmail = buildSystemEmail(payload.fullName, payload.role);
  const temporaryPassword = buildTemporaryPassword(payload.fullName, payload.role);
  const username = buildSystemUsername(payload.fullName, payload.role);
  const personalEmail = payload.personalEmail.trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(payload.contactNumber);
  const userRecord = await adminAuth.createUser({
    email: loginEmail,
    password: temporaryPassword,
    displayName: payload.fullName.trim(),
  });

  const createdAt = FieldValue.serverTimestamp();
  const userId = buildRoleUserId(payload.role, userRecord.uid);

  await adminDb.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    userId,
    role: payload.role,
    status: "active",
    displayName: payload.fullName.trim(),
    username,
    email: loginEmail,
    personalEmail,
    phoneNumber: normalizedPhone,
    nic: payload.nic.trim(),
    regionId: payload.regionId,
    clinicId: null,
    createdAt,
    updatedAt: createdAt,
    createdByUid: actor?.uid || null,
  });

  const credentials = {
    userId,
    username,
    loginEmail,
    temporaryPassword,
    deliveryEmail: personalEmail,
    deliveryQueued: await queueCredentialsEmail(payload.fullName.trim(), personalEmail, {
      userId,
      username,
      loginEmail,
      temporaryPassword,
      deliveryEmail: personalEmail,
      deliveryQueued: false,
    }),
  } satisfies CreatedCredentials;

  return credentials;
}

async function createMotherAccount(
  payload: MotherCreatePayload,
  actor: Awaited<ReturnType<typeof getCurrentSessionUser>>,
) {
  const loginEmail = buildSystemEmail(payload.fullName, "mother");
  const temporaryPassword = buildTemporaryPassword(payload.fullName, "mother");
  const username = buildSystemUsername(payload.fullName, "mother");
  const personalEmail = normalizeEmail(payload.personalEmail);
  const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
  const userRecord = await adminAuth.createUser({
    email: loginEmail,
    password: temporaryPassword,
    phoneNumber: normalizedPhone,
    displayName: payload.fullName.trim(),
  });

  const createdAt = FieldValue.serverTimestamp();
  const motherId = userRecord.uid;
  const userId = buildRoleUserId("mother", userRecord.uid);

  await adminDb.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    userId,
    motherId,
    role: "mother",
    status: "active",
    displayName: payload.fullName.trim(),
    username,
    email: loginEmail,
    personalEmail,
    phoneNumber: normalizedPhone,
    nic: payload.nic.trim(),
    regionId: payload.regionId,
    clinicId: null,
    createdAt,
    updatedAt: createdAt,
    createdByUid: actor?.uid || null,
  });

  await adminDb.collection("mothers").doc(motherId).set({
    motherId,
    userUid: userRecord.uid,
    userId,
    fullName: payload.fullName.trim(),
    nic: payload.nic.trim(),
    email: loginEmail,
    personalEmail,
    username,
    phoneNumber: normalizedPhone,
    address: payload.address.trim(),
    birthdate: payload.birthdate,
    guardianName: payload.guardianName.trim(),
    guardianContact: payload.guardianContact.trim(),
    deliveryDate: payload.deliveryDate,
    noOfChildren: payload.noOfChildren,
    regionId: payload.regionId,
    clinicId: null,
    assignedDoctorUid: payload.assignedDoctorUid || null,
    assignedMidwifeUid: payload.assignedMidwifeUid || null,
    riskLevel: "low",
    latestEpdsScore: 0,
    isHighRisk: false,
    createdAt,
    updatedAt: createdAt,
  });

  const guardianProvisioning = await createOrLinkGuardianAccount(payload, actor, {
    motherId,
    motherUid: userRecord.uid,
    motherUserId: userId,
  });

  const credentials = {
    userId,
    username,
    loginEmail,
    temporaryPassword,
    deliveryEmail: personalEmail,
    deliveryQueued: await queueCredentialsEmail(payload.fullName.trim(), personalEmail, {
      userId,
      username,
      loginEmail,
      temporaryPassword,
      deliveryEmail: personalEmail,
      deliveryQueued: false,
    }),
    guardianProvisioning: guardianProvisioning || undefined,
  } satisfies CreatedCredentials;

  return credentials;
}

async function createOrLinkGuardianAccount(
  payload: MotherCreatePayload,
  actor: Awaited<ReturnType<typeof getCurrentSessionUser>>,
  mother: {
    motherId: string;
    motherUid: string;
    motherUserId: string;
  },
): Promise<GuardianProvisioning | null> {
  const guardianName = payload.guardianName.trim();
  const guardianPhone = normalizePhoneNumber(payload.guardianContact);

  if (!guardianName || !guardianPhone) {
    return null;
  }

  let authUid = "";
  let created = false;

  try {
    const existingAuthUser = await adminAuth.getUserByPhoneNumber(guardianPhone);
    authUid = existingAuthUser.uid;
  } catch (error) {
    const code = (error as { code?: string } | undefined)?.code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  let guardianDoc = authUid
    ? await adminDb.collection("users").doc(authUid).get()
    : null;

  if (!guardianDoc?.exists) {
    const existingUserByPhone = await adminDb
      .collection("users")
      .where("phoneNumber", "==", guardianPhone)
      .limit(1)
      .get();

    if (!existingUserByPhone.empty) {
      guardianDoc = existingUserByPhone.docs[0];
      authUid = guardianDoc.id;
    }
  }

  if (guardianDoc?.exists) {
    const existingRole = String(guardianDoc.data()?.role || "").trim().toLowerCase();
    if (existingRole && existingRole !== "guardian") {
      throw new Error(
        "Guardian contact number is already used by another MamaBalance account.",
      );
    }
  }

  if (!authUid) {
    const userRecord = await adminAuth.createUser({
      phoneNumber: guardianPhone,
      displayName: guardianName,
    });
    authUid = userRecord.uid;
    created = true;
  } else {
    try {
      await adminAuth.getUser(authUid);
      await adminAuth.updateUser(authUid, {
        phoneNumber: guardianPhone,
        displayName: guardianName,
      });
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === "auth/user-not-found") {
        await adminAuth.createUser({
          uid: authUid,
          phoneNumber: guardianPhone,
          displayName: guardianName,
        });
        created = true;
      } else {
        throw error;
      }
    }
  }

  const createdAt = FieldValue.serverTimestamp();
  const guardianUserId = buildRoleUserId("guardian", authUid);

  await adminDb.collection("users").doc(authUid).set(
    {
      uid: authUid,
      userId: guardianUserId,
      role: "guardian",
      status: "active",
      displayName: guardianName,
      username: buildSystemUsername(guardianName, "guardian"),
      email: "",
      personalEmail: "",
      phoneNumber: guardianPhone,
      regionId: payload.regionId,
      clinicId: null,
      createdAt,
      updatedAt: createdAt,
      createdByUid: actor?.uid || null,
    },
    { merge: true },
  );

  await adminDb.collection("guardianLinks").doc(`${authUid}_${mother.motherId}`).set(
    {
      guardianUid: authUid,
      motherId: mother.motherId,
      motherUid: mother.motherUid,
      motherUserId: mother.motherUserId,
      relationship: "guardian",
      permissions: {
        viewVisits: true,
        viewEducation: true,
        messageDoctor: true,
        messageMidwife: true,
        viewEmergencyContacts: true,
      },
      isActive: true,
      createdAt,
      updatedAt: createdAt,
      createdByUid: actor?.uid || null,
    },
    { merge: true },
  );

  await adminDb.collection("mothers").doc(mother.motherId).set(
    {
      guardianContact: guardianPhone,
      guardianName,
      guardianRelationship: "guardian",
      guardianUid: authUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const smsDeliveryStatus = await sendGuardianAccessSms({
    guardianName,
    guardianPhone,
    motherName: payload.fullName.trim() || "the linked mother",
  });

  await adminDb.collection("guardianLinks").doc(`${authUid}_${mother.motherId}`).set(
    {
      lastOnboardingSmsSentAt:
        smsDeliveryStatus === "sent" ? FieldValue.serverTimestamp() : null,
      lastOnboardingSmsStatus: smsDeliveryStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    uid: authUid,
    userId: guardianUserId,
    displayName: guardianName,
    phoneNumber: guardianPhone,
    status: created ? "created" : "linked",
    loginMethod: "phone_otp",
    smsDeliveryStatus,
  };
}

async function sendGuardianAccessSms({
  guardianName,
  guardianPhone,
  motherName,
}: {
  guardianName: string;
  guardianPhone: string;
  motherName: string;
}): Promise<"sent" | "failed"> {
  try {
    await sendNotifySms({
      phoneNumber: guardianPhone,
      message:
        `MamaBalance: Guardian mobile access is ready for ${motherName}. ` +
        `Log in to the MamaBalance mobile app using this phone number ${guardianPhone} and verify with OTP.`,
      contactFirstName: guardianName.split(" ").filter(Boolean)[0] || "Guardian",
    });
    return "sent";
  } catch (error) {
    console.error("Failed to send guardian onboarding SMS", error);
    return "failed";
  }
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as StaffCreatePayload | MotherCreatePayload;

  if (!isAllowedToCreate(actor.role, payload.role)) {
    return NextResponse.json({ error: "You cannot create that role." }, { status: 403 });
  }

  if (!payload.fullName.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  if (!payload.personalEmail.trim()) {
    return NextResponse.json({ error: "Current email is required to deliver credentials." }, { status: 400 });
  }

  if (!payload.regionId.trim()) {
    return NextResponse.json({ error: "Region is required." }, { status: 400 });
  }

  if (actor.role === "regionaladmin" && actor.regionId && payload.regionId !== actor.regionId) {
    return NextResponse.json({ error: "Regional admins can only create users in their own region." }, { status: 403 });
  }

  try {
    let credentials: CreatedCredentials;

    if (payload.role === "mother") {
      if (!payload.assignedMidwifeUid.trim()) {
        return NextResponse.json({ error: "Assigned midwife is required." }, { status: 400 });
      }

      credentials = await createMotherAccount(payload, actor);
    } else {
      credentials = await createStaffAccount(payload, actor);
    }

    await logAuditEvent({
      actor,
      module: "Users",
      actionType: "Create",
      action: `Created ${payload.role} account`,
      target: payload.fullName.trim(),
      regionId: payload.regionId,
    });

    return NextResponse.json({ ok: true, credentials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleList(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const roleParam = request.nextUrl.searchParams.get("role");

  if (!assertManageableRole(roleParam)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  if (!isAllowedToCreate(actor.role, roleParam)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const regions = await loadRegions();
  const regionMap = getRegionMap(regions);

  if (roleParam === "mother") {
    const usersQuery = adminDb.collection("users").where("role", "==", "mother");
    const userSnapshot = await usersQuery.get();
    const filteredUserDocs =
      actor.role === "regionaladmin" && actor.regionId
        ? userSnapshot.docs.filter((doc) => doc.data().regionId === actor.regionId)
        : userSnapshot.docs;

    const motherIds = filteredUserDocs.map((doc) => doc.id);
    const motherSnapshots = await Promise.all(
      motherIds.map((id) => adminDb.collection("mothers").doc(id).get()),
    );
    const motherMap = new Map(
      motherSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
    );
    const staffMap = await fetchStaffNameMap();

    const users = filteredUserDocs.map((doc) =>
      buildMotherRow(doc.data(), motherMap.get(doc.id), regionMap, staffMap, doc.id),
    );

    return NextResponse.json({ users, regions });
  }

  const snapshot = await adminDb.collection("users").where("role", "==", roleParam).get();
  const filteredDocs =
    actor.role === "regionaladmin" && actor.regionId
      ? snapshot.docs.filter((doc) => doc.data().regionId === actor.regionId)
      : snapshot.docs;

  const users = filteredDocs.map((doc) => buildStaffRow(doc.data(), regionMap, doc.id));

  return NextResponse.json({ users, regions });
}

async function clearStaffAssignments(
  field: "assignedDoctorUid" | "assignedMidwifeUid",
  uid: string,
) {
  const snapshot = await adminDb.collection("mothers").where(field, "==", uid).get();

  if (snapshot.empty) {
    return;
  }

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      [field]: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

async function handleDelete(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { uid?: string };

  if (!payload.uid) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  if (payload.uid === actor.uid) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(payload.uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = userSnapshot.data();
  const targetRole = user?.role as ManagedRole | undefined;

  if (!targetRole || !MANAGED_ROLES.includes(targetRole)) {
    return NextResponse.json({ error: "This user cannot be deleted here." }, { status: 400 });
  }

  if (!isAllowedToManage(actor.role, targetRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (actor.role === "regionaladmin" && actor.regionId && user?.regionId !== actor.regionId) {
    return NextResponse.json({ error: "Regional admins can only delete users in their own region." }, { status: 403 });
  }

  try {
    if (targetRole === "doctor") {
      await clearStaffAssignments("assignedDoctorUid", payload.uid);
    }

    if (targetRole === "midwife") {
      await clearStaffAssignments("assignedMidwifeUid", payload.uid);
    }

    const batch = adminDb.batch();
    batch.delete(userRef);

    if (targetRole === "mother") {
      batch.delete(adminDb.collection("mothers").doc(payload.uid));
    }

    await batch.commit();
    await adminAuth.deleteUser(payload.uid);

    await logAuditEvent({
      actor,
      module: "Users",
      actionType: "Delete",
      action: `Deleted ${targetRole} account`,
      target: String(user?.displayName || user?.email || payload.uid),
      regionId: (user?.regionId as string | undefined) || actor.regionId || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete the user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleResetPassword(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    uid?: string;
    password?: string;
  };

  if (!payload.uid) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  if (!payload.password) {
    return NextResponse.json({ error: "New password is required." }, { status: 400 });
  }

  if (payload.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  const userSnapshot = await adminDb.collection("users").doc(payload.uid).get();

  if (!userSnapshot.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = userSnapshot.data();

  if (user?.role !== "regionaladmin") {
    return NextResponse.json({ error: "Password reset is only available here for regional admins." }, { status: 400 });
  }

  try {
    await adminAuth.updateUser(payload.uid, {
      password: payload.password,
    });

    await adminDb.collection("users").doc(payload.uid).update({
      updatedAt: FieldValue.serverTimestamp(),
      passwordResetAt: FieldValue.serverTimestamp(),
      passwordResetByUid: actor.uid,
    });

    await logAuditEvent({
      actor,
      module: "Security",
      actionType: "Reset Password",
      action: "Reset regional admin password",
      target: String(user?.displayName || user?.email || payload.uid),
      regionId: (user?.regionId as string | undefined) || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reset the password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleProvisionMotherPhoneAuth(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    uid?: string;
  };

  const motherSnapshot = await adminDb.collection("users").where("role", "==", "mother").get();
  const scopedDocs = motherSnapshot.docs.filter((doc) => {
    if (actor.role === "regionaladmin" && actor.regionId && doc.data().regionId !== actor.regionId) {
      return false;
    }

    if (payload.uid && doc.id !== payload.uid) {
      return false;
    }

    return true;
  });

  if (payload.uid && scopedDocs.length === 0) {
    return NextResponse.json({ error: "Mother account not found." }, { status: 404 });
  }

  let updated = 0;
  let skipped = 0;
  const failures: Array<{ uid: string; reason: string }> = [];

  for (const doc of scopedDocs) {
    const user = doc.data();
    const normalizedPhone = normalizePhoneNumber(
      String(user.phoneNumber || ""),
    );

    if (!normalizedPhone) {
      skipped += 1;
      failures.push({
        uid: doc.id,
        reason: "Missing valid phone number.",
      });
      continue;
    }

    try {
      await adminAuth.updateUser(doc.id, {
        phoneNumber: normalizedPhone,
      });

      const timestamp = FieldValue.serverTimestamp();
      await Promise.all([
        doc.ref.update({
          phoneNumber: normalizedPhone,
          phoneAuthProvisionedAt: timestamp,
          updatedAt: timestamp,
        }),
        adminDb.collection("mothers").doc(doc.id).set(
          {
            phoneNumber: normalizedPhone,
            phoneAuthProvisionedAt: timestamp,
            updatedAt: timestamp,
          },
          { merge: true },
        ),
      ]);

      updated += 1;
    } catch (error) {
      failures.push({
        uid: doc.id,
        reason: error instanceof Error ? error.message : "Provisioning failed.",
      });
    }
  }

  await logAuditEvent({
    actor,
    module: "Users",
    actionType: "Update",
    action:
      payload.uid
        ? "Provisioned mother SMS login"
        : "Provisioned mother SMS login in bulk",
    target: payload.uid || `${updated} mother account(s)`,
    regionId: actor.regionId || null,
    metadata: {
      requestedUid: payload.uid || null,
      updated,
      skipped,
      failed: failures.length,
    },
  });

  return NextResponse.json({
    ok: failures.length === 0,
    updated,
    skipped,
    failed: failures.length,
    failures,
  });
}

export async function GET(request: NextRequest) {
  return handleList(request);
}

export async function POST(request: NextRequest) {
  return handleCreate(request);
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}

export async function PATCH(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  if (type === "reset-password") {
    return handleResetPassword(request);
  }

  if (type === "provision-phone-auth") {
    return handleProvisionMotherPhoneAuth(request);
  }

  return handleUpdate(request);
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();

  const {
    uid,
    email,
    regionId,
    contact,
    status,
    assignedMidwifeUid,
    assignedDoctorUid,
    guardianName,
    guardianContact,
    deliveryDate,
    birthdate,
    noOfChildren,
    address,
    enableGuardianMobileAccess,
  } = payload;

  if (!uid) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = userSnapshot.data();

  if (!isAllowedToManage(actor.role, user?.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (actor.role === "regionaladmin" && actor.regionId && regionId && regionId !== actor.regionId) {
    return NextResponse.json(
      { error: "Regional admins can only manage users in their own region." },
      { status: 403 }
    );
  }

  try {
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = contact ? normalizePhoneNumber(contact) : null;

    await userRef.update({
      ...(normalizedEmail && {
        personalEmail: normalizedEmail,
      }),
      ...(regionId && { regionId }),
      ...(normalizedPhone && { phoneNumber: normalizedPhone }),
      ...(status && { status }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (user?.role === "mother") {
      if (normalizedPhone) {
        await adminAuth.updateUser(uid, {
          ...(normalizedPhone && { phoneNumber: normalizedPhone }),
        });
      }

      const motherRef = adminDb.collection("mothers").doc(uid);

      await motherRef.update({
        ...(normalizedEmail && { personalEmail: normalizedEmail }),
        ...(regionId && { regionId }),
        ...(normalizedPhone && { phoneNumber: normalizedPhone }),
        ...(assignedMidwifeUid && { assignedMidwifeUid }),
        ...(assignedDoctorUid !== undefined && {
          assignedDoctorUid: assignedDoctorUid || null,
        }),
        ...(guardianName !== undefined && { guardianName }),
        ...(guardianContact !== undefined && { guardianContact }),
        ...(deliveryDate !== undefined && { deliveryDate }),
        ...(birthdate !== undefined && { birthdate }),
        ...(typeof noOfChildren === "number" && { noOfChildren }),
        ...(address !== undefined && { address }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      let guardianProvisioning: GuardianProvisioning | null = null;
      if (enableGuardianMobileAccess === true) {
        const motherUserId = String(user?.userId || "");
        guardianProvisioning = await syncGuardianLinkForMother(
          {
            guardianName:
              guardianName !== undefined ? String(guardianName || "") : "",
            guardianContact:
              guardianContact !== undefined ? String(guardianContact || "") : "",
            regionId: String(regionId || user?.regionId || ""),
          },
          actor,
          {
            motherId: uid,
            motherUid: uid,
            motherUserId,
          },
        );
      }

      await logAuditEvent({
        actor,
        module: "Users",
        actionType: "Update",
        action: `Updated ${String(user?.role || "user")} profile`,
        target: String(user?.displayName || user?.email || uid),
        regionId: (regionId as string | undefined) || (user?.regionId as string | undefined) || actor.regionId || null,
        metadata: {
          changedStatus: status || null,
          guardianMobileAccessEnabled: enableGuardianMobileAccess === true,
        },
      });

      return NextResponse.json({ ok: true, guardianProvisioning });
    } else if (email) {
      await adminAuth.updateUser(uid, {
        email: normalizeEmail(email),
      });
    }

    await logAuditEvent({
      actor,
      module: "Users",
      actionType: "Update",
      action: `Updated ${String(user?.role || "user")} profile`,
      target: String(user?.displayName || user?.email || uid),
      regionId: (regionId as string | undefined) || (user?.regionId as string | undefined) || actor.regionId || null,
      metadata: {
        changedStatus: status || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function syncGuardianLinkForMother(
  payload: {
    guardianName: string;
    guardianContact: string;
    regionId: string;
  },
  actor: Awaited<ReturnType<typeof getCurrentSessionUser>>,
  mother: {
    motherId: string;
    motherUid: string;
    motherUserId: string;
  },
): Promise<GuardianProvisioning | null> {
  const guardianName = payload.guardianName.trim();
  const guardianPhone = normalizePhoneNumber(payload.guardianContact);

  if (!guardianName || !guardianPhone) {
    throw new Error("Guardian name and guardian contact are required to enable guardian mobile access.");
  }

  const createPayload = {
    role: "mother" as const,
    fullName: "",
    personalEmail: "",
    phoneNumber: "",
    nic: "",
    regionId: payload.regionId,
    address: "",
    guardianName,
    guardianContact: guardianPhone,
    deliveryDate: "",
    birthdate: "",
    noOfChildren: 0,
    assignedMidwifeUid: "",
    assignedDoctorUid: "",
  };

  return createOrLinkGuardianAccount(createPayload, actor, mother);
}
