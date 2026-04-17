import { type DocumentData } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

export type SuperadminNotificationType =
  | "support_ticket"
  | "staff_access"
  | "content_update";

export type SuperadminNotificationRow = {
  id: string;
  type: SuperadminNotificationType;
  title: string;
  message: string;
  ticketId: string | null;
  ticketNumber: string | null;
  issueCategory: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
  requesterName: string | null;
  requesterRole: string | null;
  targetPath: string;
  targetLabel: string;
};

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

function labelActor(role: string | null, actorName: string | null) {
  const resolvedName = actorName || "System user";

  if (role === "superadmin") return `Super Admin ${resolvedName}`;
  if (role === "regionaladmin") return `Regional Admin ${resolvedName}`;
  if (role === "doctor") return `Doctor ${resolvedName}`;
  if (role === "midwife") return `Midwife ${resolvedName}`;
  return resolvedName;
}

function buildAuditNotification(docId: string, data: DocumentData, read = false): SuperadminNotificationRow | null {
  const moduleName = String(data.module || "");
  const action = String(data.action || "");
  const actionType = String(data.actionType || "");
  const target = String(data.target || "").trim();
  const createdAt = toIsoString(data.createdAt);
  const actorName = String(data.actorName || data.actorLabel || "").trim() || null;
  const actorRole = String(data.actorRole || "").trim() || null;
  const actorLabel = labelActor(actorRole, actorName);

  if (moduleName === "Users" || moduleName === "Security") {
    return {
      id: `audit:${docId}`,
      type: "staff_access",
      title: moduleName === "Security" ? "Admin access updated" : "Staff account activity",
      message: `${actorLabel} ${action ? action.charAt(0).toLowerCase() + action.slice(1) : "updated account access"}${target ? ` for ${target}` : ""}.`,
      ticketId: null,
      ticketNumber: null,
      issueCategory: null,
      priority: moduleName === "Security" || actionType === "Delete" ? "high" : "medium",
      read,
      createdAt,
      requesterName: actorName,
      requesterRole: actorRole,
      targetPath: moduleName === "Security" ? "/superadmin/admin-management" : "/superadmin/user-management/doctors",
      targetLabel: moduleName === "Security" ? "Open Admin Management" : "Open User Management",
    };
  }

  if (moduleName === "Content") {
    return {
      id: `audit:${docId}`,
      type: "content_update",
      title: "Educational content updated",
      message: `${actorLabel} ${action ? action.charAt(0).toLowerCase() + action.slice(1) : "updated educational content"}${target ? `: ${target}` : ""}.`,
      ticketId: null,
      ticketNumber: null,
      issueCategory: null,
      priority: "medium",
      read,
      createdAt,
      requesterName: actorName,
      requesterRole: actorRole,
      targetPath: "/superadmin/educational-content",
      targetLabel: "Open Educational Content",
    };
  }

  return null;
}

export async function buildSuperadminNotifications(actorUid: string) {
  const [storedSnapshot, auditSnapshot, stateSnapshot] = await Promise.all([
    adminDb.collection("notifications").where("recipientUid", "==", actorUid).get(),
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(60).get(),
    adminDb.collection("superadminNotificationStates").where("recipientUid", "==", actorUid).get(),
  ]);

  const readStateMap = new Map<string, boolean>();
  const dismissedStateMap = new Map<string, boolean>();

  stateSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    readStateMap.set(String(data.notificationKey || ""), Boolean(data.read));
    dismissedStateMap.set(String(data.notificationKey || ""), Boolean(data.dismissed));
  });

  const storedNotifications = storedSnapshot.docs
    .filter((doc) => doc.data().recipientRole === "superadmin" && !doc.data().dismissed)
    .map((doc) => {
      const data = doc.data();

      return {
        id: `stored:${doc.id}`,
        type: "support_ticket" as const,
        title: String(data.title || "Notification"),
        message: String(data.message || ""),
        ticketId: (data.ticketId as string | undefined) || null,
        ticketNumber: (data.ticketNumber as string | undefined) || null,
        issueCategory: (data.issueCategory as string | undefined) || null,
        priority:
          data.priority === "low" || data.priority === "high" ? data.priority : "medium",
        read: Boolean(data.read),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        requesterName: (data.requesterName as string | undefined) || null,
        requesterRole: (data.requesterRole as string | undefined) || null,
        targetPath: "/superadmin/help-support",
        targetLabel: "Open Help & Support",
      } satisfies SuperadminNotificationRow;
    });

  const auditNotifications = auditSnapshot.docs
    .map((doc) =>
      buildAuditNotification(
        doc.id,
        doc.data(),
        readStateMap.get(`audit:${doc.id}`) ?? false,
      ),
    )
    .filter((item): item is SuperadminNotificationRow => Boolean(item))
    .filter((item) => !dismissedStateMap.get(item.id));

  return [...storedNotifications, ...auditNotifications].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}
