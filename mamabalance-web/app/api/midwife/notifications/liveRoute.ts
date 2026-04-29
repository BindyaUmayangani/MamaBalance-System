import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveLinkedMidwifeUids } from "@/lib/midwife/identity";

type MidwifeNotificationType =
  | "assignment"
  | "high_risk"
  | "overdue_visit"
  | "doctor_observation";

type MidwifeNotificationRow = {
  id: string;
  type: MidwifeNotificationType;
  title: string;
  message: string;
  motherUid: string | null;
  motherName: string | null;
  score: number | null;
  riskLevel: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
};

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function toIsoString(value: unknown) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDisplayDateTime(value: unknown) {
  const iso = toIsoString(value);
  if (!iso) return "recently";

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function resolveMotherName(mother: DocumentData, user: DocumentData | undefined) {
  return String(mother.fullName || "") || String(user?.displayName || "") || "Assigned mother";
}

function resolveRiskLevel(mother: DocumentData) {
  const explicit = String(mother.riskLevel || "").toLowerCase();
  if (explicit === "high" || explicit === "moderate" || explicit === "low") return explicit;

  const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
  if (latestEpdsScore >= 20) return "high";
  if (latestEpdsScore >= 10) return "moderate";
  return "low";
}

function hasSelfHarmThoughts(mother: DocumentData) {
  if (mother.latestEpdsHasSelfHarmThoughts === true) return true;

  const selfHarmScore = Number(mother.latestEpdsSelfHarmScore ?? 0);
  return Number.isFinite(selfHarmScore) && selfHarmScore > 0;
}

function requiresUrgentReview(mother: DocumentData) {
  return mother.latestEpdsRequiresUrgentReview === true || mother.isHighRisk === true || hasSelfHarmThoughts(mother);
}

function resolveVisitStatus(rawStatus: unknown, scheduledAt: unknown) {
  const normalized = String(rawStatus || "");
  if (normalized === "Completed" || normalized === "Rescheduled") return normalized;

  const parsed = new Date(String(scheduledAt || ""));
  if (Number.isNaN(parsed.getTime())) return "Upcoming";
  return parsed.getTime() < Date.now() ? "Overdue" : "Upcoming";
}

function resolveDoctorName(user: DocumentData | undefined, fallback: unknown) {
  const name = String(user?.displayName || user?.username || fallback || "Doctor");
  return name.startsWith("Dr. ") ? name : `Dr. ${name}`;
}

async function loadMotherUsers(motherUids: string[]) {
  const users = await Promise.all(
    motherUids.map((uid) => adminDb.collection("users").doc(uid).get()),
  );
  return new Map(users.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));
}

async function buildNotifications(actorUid: string, linkedMidwifeUids: string[]) {
  const [motherSnapshots, storedSnapshots, stateSnapshot] = await Promise.all([
    Promise.all(
      chunk(linkedMidwifeUids, 10).map((uids) =>
        adminDb.collection("mothers").where("assignedMidwifeUid", "in", uids).get(),
      ),
    ),
    Promise.all(
      chunk(linkedMidwifeUids, 10).map((uids) =>
        adminDb
          .collection("notifications")
          .where("recipientRole", "==", "midwife")
          .where("recipientUid", "in", uids)
          .get(),
      ),
    ),
    adminDb
      .collection("midwifeNotificationStates")
      .where("recipientUid", "==", actorUid)
      .get(),
  ]);

  const motherDocs = motherSnapshots.flatMap((snapshot) => snapshot.docs);
  const motherMap = new Map(motherDocs.map((doc) => [doc.id, doc.data()]));
  const motherUids = [...motherMap.keys()];
  const motherUserMap = await loadMotherUsers(motherUids);

  const readStateMap = new Map<string, boolean>();
  const dismissedStateMap = new Map<string, boolean>();
  stateSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    readStateMap.set(String(data.notificationKey || ""), Boolean(data.read));
    dismissedStateMap.set(String(data.notificationKey || ""), Boolean(data.dismissed));
  });

  const [visitSnapshots, doctorObservationSnapshots] =
    motherUids.length > 0
      ? await Promise.all([
          Promise.all(
            chunk(motherUids, 10).map((uids) =>
              adminDb.collection("midwifeVisits").where("motherUid", "in", uids).get(),
            ),
          ),
          Promise.all(
            chunk(motherUids, 10).map((uids) =>
              adminDb
                .collection("careObservations")
                .where("motherUid", "in", uids)
                .where("authorRole", "==", "doctor")
                .get(),
            ),
          ),
        ])
      : [[], []];

  const doctorUidSet = new Set<string>();
  doctorObservationSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const doctorId = String(doc.data().doctorId || "");
      if (doctorId) doctorUidSet.add(doctorId);
    });
  });

  const doctorUsers = await Promise.all(
    [...doctorUidSet].map((uid) => adminDb.collection("users").doc(uid).get()),
  );
  const doctorUserMap = new Map(
    doctorUsers.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );

  const notifications: MidwifeNotificationRow[] = [];

  motherMap.forEach((mother, motherUid) => {
    const motherName = resolveMotherName(mother, motherUserMap.get(motherUid));
    const assignedAt = toIsoString(mother.assignedMidwifeAssignedAt ?? mother.createdAt ?? mother.updatedAt);
    const assignmentKey = `assignment:${motherUid}:${assignedAt || "unknown"}`;
    const riskLevel = resolveRiskLevel(mother);
    const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
    const selfHarmThoughts = hasSelfHarmThoughts(mother);
    const urgentReview = requiresUrgentReview(mother);

    notifications.push({
      id: assignmentKey,
      type: "assignment",
      title: "Mother assigned to your profile",
      message: `${motherName} was assigned to your midwife profile${assignedAt ? ` on ${toDisplayDateTime(assignedAt)}` : ""}.`,
      motherUid,
      motherName,
      score: null,
      riskLevel,
      priority: "medium",
      read: readStateMap.get(assignmentKey) ?? false,
      createdAt: assignedAt,
    });

    if (riskLevel === "high" || latestEpdsScore >= 20 || urgentReview) {
      const riskCreatedAt = toIsoString(
        mother.latestEpdsSubmittedAt ??
          mother.latestEpdsAttemptedAt ??
          mother.latestEpdsCreatedAt ??
          mother.updatedAt,
      );
      const riskKey = `high_risk:${motherUid}:${riskCreatedAt || latestEpdsScore || "current"}`;
      const selfHarmOnlyAlert = selfHarmThoughts && riskLevel !== "high";

      notifications.push({
        id: riskKey,
        type: "high_risk",
        title: selfHarmOnlyAlert
          ? "Self-harm response needs follow-up"
          : "Mother is high risk",
        message: selfHarmOnlyAlert
          ? `${motherName} reported thoughts of self-harm on EPDS question 10${latestEpdsScore > 0 ? ` with overall EPDS score ${latestEpdsScore} (${riskLevel} risk)` : ""}.`
          : `${motherName} is currently marked high risk${latestEpdsScore > 0 ? ` with EPDS score ${latestEpdsScore}` : ""}.`,
        motherUid,
        motherName,
        score: Number.isFinite(latestEpdsScore) && latestEpdsScore > 0 ? latestEpdsScore : null,
        riskLevel,
        priority: "high",
        read: readStateMap.get(riskKey) ?? false,
        createdAt: riskCreatedAt,
      });
    }
  });

  visitSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (resolveVisitStatus(data.status, data.scheduledAt) !== "Overdue") return;

      const motherUid = String(data.motherUid || "");
      const mother = motherMap.get(motherUid);
      const motherName = mother
        ? resolveMotherName(mother, motherUserMap.get(motherUid))
        : String(data.motherName || "Assigned mother");
      const notificationKey = `overdue_visit:${doc.id}`;

      notifications.push({
        id: notificationKey,
        type: "overdue_visit",
        title: "Visit is overdue",
        message: `${motherName} has an overdue ${data.visitType === "clinic" ? "clinic" : "home"} visit scheduled for ${toDisplayDateTime(data.scheduledAt)}.`,
        motherUid: motherUid || null,
        motherName,
        score: null,
        riskLevel: mother ? resolveRiskLevel(mother) : null,
        priority: "high",
        read: readStateMap.get(notificationKey) ?? false,
        createdAt: toIsoString(data.scheduledAt) || toIsoString(data.updatedAt) || toIsoString(data.createdAt),
      });
    });
  });

  doctorObservationSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const motherUid = String(data.motherUid || "");
      const mother = motherMap.get(motherUid);
      if (!mother) return;

      const motherName = resolveMotherName(mother, motherUserMap.get(motherUid));
      const doctorId = String(data.doctorId || "");
      const doctorName = resolveDoctorName(doctorUserMap.get(doctorId), data.observedBy);
      const title = String(data.title || "Observation update");
      const createdAt = toIsoString(data.observedAt || data.createdAt || data.updatedAt);
      const notificationKey = `doctor_observation:${doc.id}`;

      notifications.push({
        id: notificationKey,
        type: "doctor_observation",
        title: "Doctor added an observation",
        message: `${doctorName} added "${title}" for ${motherName}.${data.nextObservationAt ? ` Next observation: ${toDisplayDateTime(data.nextObservationAt)}.` : ""}`,
        motherUid,
        motherName,
        score: null,
        riskLevel: resolveRiskLevel(mother),
        priority: "medium",
        read: readStateMap.get(notificationKey) ?? false,
        createdAt,
      });
    });
  });

  storedSnapshots
    .flatMap((snapshot) => snapshot.docs)
    .forEach((doc) => {
      const data = doc.data();
      if (data.dismissed) return;

      notifications.push({
        id: `stored:${doc.id}`,
        type: "high_risk",
        title: String(data.title || "Notification"),
        message: String(data.message || ""),
        motherUid: (data.motherUid as string | undefined) || null,
        motherName: (data.motherName as string | undefined) || null,
        score: typeof data.score === "number" ? data.score : Number.isFinite(Number(data.score)) ? Number(data.score) : null,
        riskLevel: (data.riskLevel as string | undefined) || null,
        priority: data.priority === "low" || data.priority === "high" ? data.priority : "medium",
        read: Boolean(data.read),
        createdAt: toIsoString(data.createdAt || data.attemptedAt),
      });
    });

  const uniqueNotifications = new Map<string, MidwifeNotificationRow>();
  notifications.forEach((item) => {
    if (!dismissedStateMap.get(item.id)) uniqueNotifications.set(item.id, item);
  });

  return [...uniqueNotifications.values()].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function buildReadStateDocId(recipientUid: string, notificationKey: string) {
  return `${recipientUid}_${Buffer.from(notificationKey).toString("base64url")}`;
}

async function upsertState(recipientUid: string, notificationKey: string, updates: Record<string, unknown>) {
  await adminDb
    .collection("midwifeNotificationStates")
    .doc(buildReadStateDocId(recipientUid, notificationKey))
    .set({
      recipientUid,
      notificationKey,
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function updateStoredNotification(notificationKey: string, updates: Record<string, unknown>) {
  if (!notificationKey.startsWith("stored:")) return false;
  await adminDb.collection("notifications").doc(notificationKey.replace(/^stored:/, "")).update(updates);
  return true;
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);
  const notifications = await buildNotifications(actor.uid, linkedMidwifeUids);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    markAll?: boolean;
    dismiss?: boolean;
  };

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  if (payload.markAll) {
    const notifications = await buildNotifications(actor.uid, linkedMidwifeUids);
    await Promise.all(
      notifications
        .filter((item) => !item.read)
        .map((item) =>
          item.id.startsWith("stored:")
            ? updateStoredNotification(item.id, {
                read: true,
                updatedAt: FieldValue.serverTimestamp(),
              })
            : upsertState(actor.uid, item.id, { read: true }),
        ),
    );
    return NextResponse.json({ ok: true });
  }

  if (!payload.id) {
    return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
  }

  const notifications = await buildNotifications(actor.uid, linkedMidwifeUids);
  const target = notifications.find((item) => item.id === payload.id);

  if (!target) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  if (payload.dismiss) {
    if (payload.id.startsWith("stored:")) {
      await updateStoredNotification(payload.id, {
        dismissed: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await upsertState(actor.uid, payload.id, { dismissed: true });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.id.startsWith("stored:")) {
    await updateStoredNotification(payload.id, {
      read: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await upsertState(actor.uid, payload.id, { read: true });
  }

  return NextResponse.json({ ok: true });
}
