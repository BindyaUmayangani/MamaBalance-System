import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";

type DoctorNotificationType =
  | "assignment"
  | "overdue_checkup"
  | "midwife_observation";

type DoctorNotificationRow = {
  id: string;
  type: DoctorNotificationType;
  title: string;
  message: string;
  motherUid: string | null;
  motherName: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
};

type AuditLogRow = {
  action: string;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
};

function toIsoString(value: unknown) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toDisplayDateTime(value: unknown) {
  const iso = toIsoString(value);

  if (!iso) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function resolveMotherName(mother: DocumentData, user: DocumentData | undefined) {
  return (
    String(mother.fullName || "") ||
    String(user?.displayName || "") ||
    "Assigned mother"
  );
}

function resolveMidwifeName(user: DocumentData | undefined) {
  const displayName =
    String(user?.displayName || "") ||
    String(user?.username || "") ||
    "Midwife";

  return displayName.startsWith("Midwife ") ? displayName : `Midwife ${displayName}`;
}

function resolveCheckupStatus(rawStatus: unknown, scheduledAt: unknown) {
  const normalized = String(rawStatus || "");

  if (normalized === "Completed") {
    return "Completed";
  }

  const date = new Date(String(scheduledAt || ""));

  if (Number.isNaN(date.getTime())) {
    return "Upcoming";
  }

  return date.getTime() < Date.now() ? "Overdue" : "Upcoming";
}

function labelAuditActor(role: string | null, actorName: string | null) {
  const resolvedName = actorName || "System user";

  if (role === "midwife") {
    return `Midwife ${resolvedName}`;
  }

  if (role === "regionaladmin") {
    return `Regional Admin ${resolvedName}`;
  }

  if (role === "superadmin") {
    return `Super Admin ${resolvedName}`;
  }

  if (role === "doctor") {
    return `Doctor ${resolvedName}`;
  }

  return resolvedName;
}

function formatObservationSource(source: unknown) {
  return String(source || "") === "clinicVisit" ? "clinic visit" : "home visit";
}

async function buildNotifications(actorUid: string, linkedDoctorUids: string[]) {
  const motherSnapshots = await Promise.all(
    linkedDoctorUids.map((uid) =>
      adminDb.collection("mothers").where("assignedDoctorUid", "==", uid).get(),
    ),
  );

  const motherDocs = motherSnapshots.flatMap((snapshot) => snapshot.docs);
  const motherMap = new Map(motherDocs.map((doc) => [doc.id, doc.data()]));

  if (motherMap.size === 0) {
    return [] as DoctorNotificationRow[];
  }

  const motherUids = [...motherMap.keys()];
  const [motherUsers, midwifeObservationSnapshots, doctorCheckupSnapshots, readStateSnapshot, auditSnapshots] =
    await Promise.all([
      Promise.all(
        motherUids.map((uid) => adminDb.collection("users").doc(uid).get()),
      ),
      Promise.all(
        motherUids.reduce((chunks, uid, index) => {
          const chunkIndex = Math.floor(index / 10);
          if (!chunks[chunkIndex]) {
            chunks[chunkIndex] = [];
          }
          chunks[chunkIndex].push(uid);
          return chunks;
        }, [] as string[][]).map((uids) =>
          adminDb.collection("midwifeObservations").where("motherUid", "in", uids).get(),
        ),
      ),
      Promise.all(
        linkedDoctorUids.reduce((chunks, uid, index) => {
          const chunkIndex = Math.floor(index / 10);
          if (!chunks[chunkIndex]) {
            chunks[chunkIndex] = [];
          }
          chunks[chunkIndex].push(uid);
          return chunks;
        }, [] as string[][]).map((uids) =>
          adminDb.collection("doctorCheckups").where("doctorUid", "in", uids).get(),
        ),
      ),
      adminDb
        .collection("doctorNotificationStates")
        .where("recipientUid", "==", actorUid)
        .get(),
      Promise.all(
        motherUids.reduce((chunks, uid, index) => {
          const chunkIndex = Math.floor(index / 10);
          if (!chunks[chunkIndex]) {
            chunks[chunkIndex] = [];
          }
          chunks[chunkIndex].push(uid);
          return chunks;
        }, [] as string[][]).map((uids) =>
          adminDb.collection("auditLogs").where("metadata.motherUid", "in", uids).get(),
        ),
      ),
    ]);

  const motherUserMap = new Map(
    motherUsers.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );

  const midwifeUidSet = new Set<string>();
  midwifeObservationSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const midwifeUid = String(doc.data().midwifeUid || "");
      if (midwifeUid) {
        midwifeUidSet.add(midwifeUid);
      }
    });
  });

  const midwifeUsers = await Promise.all(
    [...midwifeUidSet].map((uid) => adminDb.collection("users").doc(uid).get()),
  );
  const midwifeUserMap = new Map(
    midwifeUsers.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );

  const readStateMap = new Map<string, boolean>();
  const dismissedStateMap = new Map<string, boolean>();
  readStateSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    readStateMap.set(String(data.notificationKey || ""), Boolean(data.read));
    dismissedStateMap.set(String(data.notificationKey || ""), Boolean(data.dismissed));
  });

  const notifications: DoctorNotificationRow[] = [];
  const auditLogs = auditSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        action: String(data.action || ""),
        actorName: data.actorName ? String(data.actorName) : null,
        actorRole: data.actorRole ? String(data.actorRole) : null,
        createdAt: toIsoString(data.createdAt),
        metadata:
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>)
            : {},
      } satisfies AuditLogRow;
    }),
  );

  const assignmentAuditMap = new Map<string, AuditLogRow>();
  auditLogs.forEach((log) => {
    const motherUid = String(log.metadata.motherUid || "");
    const doctorUid = String(log.metadata.doctorUid || "");

    if (!motherUid || !linkedDoctorUids.includes(doctorUid)) {
      return;
    }

    if (log.action !== "Assigned doctor to mother") {
      return;
    }

    const current = assignmentAuditMap.get(motherUid);
    const currentTime = current?.createdAt ? new Date(current.createdAt).getTime() : 0;
    const nextTime = log.createdAt ? new Date(log.createdAt).getTime() : 0;

    if (!current || nextTime > currentTime) {
      assignmentAuditMap.set(motherUid, log);
    }
  });

  motherMap.forEach((mother, motherUid) => {
    const motherUser = motherUserMap.get(motherUid);
    const motherName = resolveMotherName(mother, motherUser);
    const assignmentAudit = assignmentAuditMap.get(motherUid);
    const assignedAt = toIsoString(
      mother.assignedDoctorAssignedAt ?? mother.createdAt ?? mother.updatedAt,
    );
    const notificationKey = `assignment:${motherUid}:${assignedAt || "unknown"}`;
    const actorLabel = assignmentAudit
      ? labelAuditActor(assignmentAudit.actorRole, assignmentAudit.actorName)
      : "A care team member";

    notifications.push({
      id: notificationKey,
      type: "assignment",
      title: "Mother assigned to your profile",
      message: `${actorLabel} assigned ${motherName} to your doctor profile${assignmentAudit?.createdAt ? ` on ${toDisplayDateTime(assignmentAudit.createdAt)}` : ""}.`,
      motherUid,
      motherName,
      priority: "medium",
      read: readStateMap.get(notificationKey) ?? false,
      createdAt: assignmentAudit?.createdAt || assignedAt,
    });
  });

  doctorCheckupSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = resolveCheckupStatus(data.status, data.scheduledAt);

      if (status !== "Overdue") {
        return;
      }

      const motherUid = String(data.motherUid || "");
      const mother = motherMap.get(motherUid);
      const motherUser = motherUserMap.get(motherUid);
      const motherName = mother
        ? resolveMotherName(mother, motherUser)
        : String(data.motherName || "Assigned mother");
      const scheduledAtIso = toIsoString(data.scheduledAt);
      const notificationKey = `overdue_checkup:${doc.id}`;

      notifications.push({
        id: notificationKey,
        type: "overdue_checkup",
        title: "Checkup is overdue",
        message: `${motherName} has an overdue doctor checkup scheduled for ${toDisplayDateTime(data.scheduledAt)}.${String(data.notes || "").trim() && String(data.notes || "").trim() !== "No additional notes." ? ` Notes: ${String(data.notes).trim()}` : ""}`,
        motherUid: motherUid || null,
        motherName,
        priority: "high",
        read: readStateMap.get(notificationKey) ?? false,
        createdAt: scheduledAtIso || toIsoString(data.updatedAt) || toIsoString(data.createdAt),
      });
    });
  });

  midwifeObservationSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const motherUid = String(data.motherUid || "");
      const mother = motherMap.get(motherUid);

      if (!mother) {
        return;
      }

      const motherUser = motherUserMap.get(motherUid);
      const motherName = resolveMotherName(mother, motherUser);
      const midwifeUid = String(data.midwifeUid || "");
      const midwifeName = resolveMidwifeName(midwifeUserMap.get(midwifeUid));
      const observationTitle = String(data.title || "Observation update");
      const createdAt = toIsoString(data.observedAt || data.createdAt || data.updatedAt);
      const notificationKey = `midwife_observation:${doc.id}`;
      const nextObservationAt = toIsoString(data.nextObservationAt);
      const sourceLabel = formatObservationSource(data.source);

      notifications.push({
        id: notificationKey,
        type: "midwife_observation",
        title: `New ${sourceLabel} observation`,
        message: `${midwifeName} added "${observationTitle}" for ${motherName}.${nextObservationAt ? ` Next observation: ${toDisplayDateTime(nextObservationAt)}.` : ""}`,
        motherUid,
        motherName,
        priority: "medium",
        read: readStateMap.get(notificationKey) ?? false,
        createdAt,
      });
    });
  });

  return notifications
    .filter((item) => !dismissedStateMap.get(item.id))
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

function buildReadStateDocId(recipientUid: string, notificationKey: string) {
  return `${recipientUid}_${Buffer.from(notificationKey).toString("base64url")}`;
}

async function upsertReadState(recipientUid: string, notificationKey: string) {
  await adminDb
    .collection("doctorNotificationStates")
    .doc(buildReadStateDocId(recipientUid, notificationKey))
    .set({
      recipientUid,
      notificationKey,
      read: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function upsertDismissedState(recipientUid: string, notificationKey: string) {
  await adminDb
    .collection("doctorNotificationStates")
    .doc(buildReadStateDocId(recipientUid, notificationKey))
    .set({
      recipientUid,
      notificationKey,
      dismissed: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);
  const notifications = await buildNotifications(actor.uid, linkedDoctorUids);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    markAll?: boolean;
    dismiss?: boolean;
  };

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);

  if (payload.markAll) {
    const notifications = await buildNotifications(actor.uid, linkedDoctorUids);
    const unreadNotifications = notifications.filter((item) => !item.read);

    await Promise.all(
      unreadNotifications.map((item) => upsertReadState(actor.uid, item.id)),
    );

    return NextResponse.json({ ok: true });
  }

  if (!payload.id) {
    return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
  }

  const notifications = await buildNotifications(actor.uid, linkedDoctorUids);
  const target = notifications.find((item) => item.id === payload.id);

  if (!target) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  if (payload.dismiss) {
    await upsertDismissedState(actor.uid, payload.id);
    return NextResponse.json({ ok: true });
  }

  await upsertReadState(actor.uid, payload.id);

  return NextResponse.json({ ok: true });
}
