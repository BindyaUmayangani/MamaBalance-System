import { NextRequest, NextResponse } from "next/server";
import { type DocumentData } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

type MobileRole = "mother" | "guardian";

type MobileContext = {
  authUid: string;
  role: MobileRole;
  userDocId: string;
  motherDocId: string;
  mother: DocumentData;
};

function readString(value: unknown, fallback = "") {
  const raw = String(value || "").trim();
  return raw || fallback;
}

function toIso(value: unknown) {
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextEpdsAvailableAt(value: unknown) {
  const latestIso = toIso(value);
  if (!latestIso) return null;
  return addDays(new Date(latestIso), 7);
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date) {
  return `${formatDate(value)} at ${value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function notification({
  id,
  title,
  description,
  type,
  priority = "medium",
  createdAt,
}: {
  id: string;
  title: string;
  description: string;
  type: string;
  priority?: string;
  createdAt: Date;
}) {
  return {
    id,
    title,
    description,
    type,
    priority,
    createdAt: createdAt.toISOString(),
    read: false,
  };
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
    if (!byGuardianUid.empty) return byGuardianUid.docs[0];

    const phone = readString(decoded.phone_number);
    if (phone) {
      const byContact = await adminDb.collection("mothers").where("guardianContact", "==", phone).limit(1).get();
      if (!byContact.empty) return byContact.docs[0];
    }

    const link = await adminDb
      .collection("guardianLinks")
      .where("guardianUid", "==", userDocId)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    const motherId = readString(link.docs[0]?.data().motherId);
    if (motherId) {
      const motherDoc = await adminDb.collection("mothers").doc(motherId).get();
      if (motherDoc.exists) return motherDoc;
    }
    return null;
  }

  const direct = await adminDb.collection("mothers").doc(userDocId).get();
  if (direct.exists) return direct;
  const byUserUid = await adminDb.collection("mothers").where("userUid", "==", userDocId).limit(1).get();
  if (!byUserUid.empty) return byUserUid.docs[0];
  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb.collection("mothers").where("phoneNumber", "==", phone).limit(1).get();
    if (!byPhone.empty) return byPhone.docs[0];
  }
  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byPersonalEmail = await adminDb.collection("mothers").where("personalEmail", "==", email).limit(1).get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }
  return null;
}

async function resolveMobileContext(request: NextRequest): Promise<MobileContext | NextResponse> {
  const decoded = await verifyMobileRequest(request);
  const userDoc = await findUserDoc(decoded);
  if (!userDoc?.exists) {
    return NextResponse.json({ error: "This account has not been registered in MamaBalance yet." }, { status: 404 });
  }
  const user = userDoc.data() || {};
  const role = readString(user.role).toLowerCase() as MobileRole;
  if (!["mother", "guardian"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized mobile account." }, { status: 403 });
  }
  if (readString(user.status).toLowerCase() !== "active") {
    return NextResponse.json({ error: "Your account is not active yet." }, { status: 403 });
  }
  const motherDoc = await findMotherDoc(role, userDoc.id, decoded);
  if (!motherDoc?.exists) {
    return NextResponse.json({ error: "Unable to find your linked mother profile." }, { status: 404 });
  }
  return {
    authUid: decoded.uid,
    role,
    userDocId: userDoc.id,
    motherDocId: motherDoc.id,
    mother: motherDoc.data() || {},
  };
}

function matchesAudience(data: DocumentData, audience: string) {
  const normalized = new Set<string>();
  const directAudience = data.audience;
  if (typeof directAudience === "string" && directAudience.trim()) {
    normalized.add(directAudience.trim().toLowerCase());
  }
  for (const key of ["audienceTags", "audiences"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      value.map((item) => readString(item).toLowerCase()).filter(Boolean).forEach((item) => normalized.add(item));
    }
  }
  if (audience === "guardian") return normalized.has("guardian") || normalized.has("father");
  if (normalized.size === 0) return audience === "mother";
  return normalized.has(audience) || normalized.has("all");
}

async function loadStaffName(uid: string, role: "doctor" | "midwife") {
  if (!uid) return role === "doctor" ? "Dr. Doctor" : "Assigned midwife";
  const doc = await adminDb.collection("users").doc(uid).get();
  const raw = readString(doc.data()?.displayName || doc.data()?.fullName);
  if (role === "doctor") return raw ? (raw.toLowerCase().startsWith("dr.") ? raw : `Dr. ${raw}`) : "Dr. Doctor";
  return raw ? (raw.toLowerCase().startsWith("midwife ") ? raw : `Midwife ${raw}`) : "Assigned midwife";
}

function isOverdue(status: string, scheduledAt: Date, now: Date) {
  return status !== "completed" && status !== "cancelled" && scheduledAt <= now;
}

async function buildVisitNotifications(context: MobileContext, now: Date) {
  const [midwifeVisitsSnapshot, doctorCheckupsSnapshot] = await Promise.all([
    adminDb.collection("midwifeVisits").where("motherUid", "==", context.motherDocId).get(),
    adminDb.collection("doctorCheckups").where("motherUid", "==", context.motherDocId).get(),
  ]);
  const items = [];

  for (const doc of midwifeVisitsSnapshot.docs) {
    const data = doc.data();
    const scheduledIso = toIso(data.scheduledAt);
    if (!scheduledIso) continue;
    const scheduledAt = new Date(scheduledIso);
    const status = readString(data.status).toLowerCase();
    const visitType = readString(data.visitType, "home").toLowerCase();
    const label = visitType === "clinic" ? "clinic visit" : "home visit";
    const createdAt = new Date(toIso(data.createdAt) || scheduledIso);
    if (isOverdue(status, scheduledAt, now)) {
      items.push(notification({
        id: `${context.role === "guardian" ? "guardian:" : ""}overdue:midwife:${doc.id}`,
        title: `${label[0].toUpperCase()}${label.slice(1)} is overdue`,
        description: `${context.role === "guardian" ? "The" : "Your"} ${label} scheduled for ${formatDateTime(scheduledAt)} is now overdue.`,
        type: "Visit",
        priority: "high",
        createdAt: scheduledAt,
      }));
    } else if (scheduledAt > now || createdAt > addDays(now, -30)) {
      items.push(notification({
        id: `${context.role === "guardian" ? "guardian:" : ""}new:midwife:${doc.id}`,
        title: scheduledAt > now ? `Upcoming ${label}` : `New ${label} added`,
        description: `A ${label} is scheduled for ${formatDateTime(scheduledAt)}.`,
        type: "Visit",
        priority: scheduledAt.getTime() - now.getTime() <= 2 * 86400000 ? "high" : "medium",
        createdAt,
      }));
    }
  }

  for (const doc of doctorCheckupsSnapshot.docs) {
    const data = doc.data();
    const scheduledIso = toIso(data.scheduledAt);
    if (!scheduledIso) continue;
    const scheduledAt = new Date(scheduledIso);
    const status = readString(data.status).toLowerCase();
    const createdAt = new Date(toIso(data.createdAt) || scheduledIso);
    if (isOverdue(status, scheduledAt, now)) {
      items.push(notification({
        id: `${context.role === "guardian" ? "guardian:" : ""}overdue:doctor:${doc.id}`,
        title: "Doctor checkup is overdue",
        description: `${context.role === "guardian" ? "The" : "Your"} doctor checkup scheduled for ${formatDateTime(scheduledAt)} is overdue.`,
        type: "Checkup",
        priority: "high",
        createdAt: scheduledAt,
      }));
    } else if (scheduledAt > now || createdAt > addDays(now, -30)) {
      items.push(notification({
        id: `${context.role === "guardian" ? "guardian:" : ""}new:doctor:${doc.id}`,
        title: scheduledAt > now ? "Upcoming doctor checkup" : "New doctor checkup added",
        description: `A doctor checkup is scheduled for ${formatDateTime(scheduledAt)}.`,
        type: "Checkup",
        priority: scheduledAt.getTime() - now.getTime() <= 2 * 86400000 ? "high" : "medium",
        createdAt,
      }));
    }
  }

  return items;
}

async function buildResourceNotifications(context: MobileContext, now: Date) {
  const snapshot = await adminDb.collection("educationalContents").where("visibility", "==", "visible").get();
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    if (!matchesAudience(data, context.role)) return [];
    const createdIso = toIso(data.createdAt) || toIso(data.updatedAt);
    const createdAt = createdIso ? new Date(createdIso) : now;
    if (createdAt < addDays(now, -30)) return [];
    const title = readString(data.title, "New resource");
    return [
      notification({
        id: `${context.role === "guardian" ? "guardian:" : ""}resource:${doc.id}`,
        title: context.role === "guardian" ? "New guardian resource is available" : "New educational content is available",
        description: `${title} has been added to ${context.role === "guardian" ? "guardian " : ""}educational resources.`,
        type: "Resource",
        priority: "low",
        createdAt,
      }),
    ];
  });
}

async function buildMessageNotifications(context: MobileContext) {
  if (context.role !== "mother") return [];
  const doctorUid = readString(context.mother.assignedDoctorUid);
  const midwifeUid = readString(context.mother.assignedMidwifeUid);
  const conversations = [
    midwifeUid ? { id: `${context.motherDocId}_midwife_${midwifeUid}`, role: "midwife" as const, uid: midwifeUid } : null,
    doctorUid ? { id: `${context.motherDocId}_doctor_${doctorUid}`, role: "doctor" as const, uid: doctorUid } : null,
  ].filter(Boolean) as Array<{ id: string; role: "doctor" | "midwife"; uid: string }>;
  const items = [];

  for (const conversation of conversations) {
    const doc = await adminDb.collection("conversations").doc(conversation.id).get();
    const data = doc.data();
    if (!doc.exists || !data) continue;
    const lastMessageIso = toIso(data.lastMessageAt);
    if (!lastMessageIso) continue;
    const lastReadIso = toIso(data.lastReadByMotherAt);
    const senderUid = readString(data.lastMessageSenderUid);
    if (!senderUid || senderUid === context.authUid) continue;
    if (lastReadIso && new Date(lastMessageIso) <= new Date(lastReadIso)) continue;
    const staffName = await loadStaffName(conversation.uid, conversation.role);
    const createdAt = new Date(lastMessageIso);
    items.push(notification({
      id: `message:${conversation.id}:${createdAt.getTime()}`,
      title: `New message from ${staffName}`,
      description: "Open secure chat to read the latest care message.",
      type: "Message",
      priority: "medium",
      createdAt,
    }));
  }

  return items;
}

async function buildNotifications(context: MobileContext) {
  const now = new Date();
  const items = [];
  const nextDue = nextEpdsAvailableAt(context.mother.latestEpdsSubmittedAt);
  if (!nextDue) {
    items.push(notification({
      id: context.role === "guardian" ? "guardian:epds:first-checkin" : "epds:first-checkin",
      title: context.role === "guardian" ? "First EPDS assessment is still pending" : "Your weekly EPDS check-in is ready",
      description: context.role === "guardian"
        ? "The linked mother has not completed the first EPDS assessment yet."
        : "Complete your first check-in to start tracking your emotional wellbeing week by week.",
      type: context.role === "guardian" ? "Assessment" : "Reminder",
      createdAt: now,
    }));
  } else if (nextDue <= now) {
    const overdueDays = Math.max(0, Math.floor((now.getTime() - nextDue.getTime()) / 86400000));
    items.push(notification({
      id: `${context.role === "guardian" ? "guardian:" : ""}epds:${overdueDays > 0 ? `overdue:${overdueDays}` : "due"}`,
      title: context.role === "guardian"
        ? overdueDays > 0 ? "EPDS assessment is overdue" : "EPDS assessment is due now"
        : overdueDays > 0 ? "Your weekly EPDS check-in is overdue" : "Time for your weekly EPDS check-in",
      description: overdueDays > 0
        ? `The EPDS assessment was due on ${formatDate(nextDue)}.`
        : "A weekly EPDS assessment is now due.",
      type: "Assessment",
      priority: overdueDays > 0 ? "high" : "medium",
      createdAt: nextDue,
    }));
  }

  if (context.role === "mother") {
    const doctorUid = readString(context.mother.assignedDoctorUid);
    if (doctorUid) {
      const doctorName = await loadStaffName(doctorUid, "doctor");
      items.push(notification({
        id: `assignment:doctor:${doctorUid}`,
        title: "A doctor has been assigned to your care",
        description: `${doctorName} is now part of your care team and available through secure messaging and checkups.`,
        type: "Care team",
        priority: "medium",
        createdAt: new Date(toIso(context.mother.updatedAt) || now),
      }));
    }
  }

  items.push(...await buildResourceNotifications(context, now));
  items.push(...await buildVisitNotifications(context, now));
  items.push(...await buildMessageNotifications(context));

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    const items = await buildNotifications(context);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
