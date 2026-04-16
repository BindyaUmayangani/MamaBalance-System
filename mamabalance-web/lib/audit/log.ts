import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import type { StaffRole, UserProfile } from "@/lib/auth/types";

type AuditModule =
  | "Users"
  | "Content"
  | "Settings"
  | "Support"
  | "Notifications"
  | "Security"
  | "Visits"
  | "Observations";

type AuditActionType =
  | "Create"
  | "Update"
  | "Delete"
  | "Export"
  | "Submit"
  | "Read"
  | "Reset Password"
  | "Assign"
  | "Reschedule"
  | "Complete";

type LogAuditEventInput = {
  actor: UserProfile;
  module: AuditModule;
  actionType: AuditActionType;
  action: string;
  target: string;
  regionId?: string | null;
  metadata?: Record<string, unknown>;
};

async function resolveActorName(actor: UserProfile) {
  if (actor.displayName?.trim()) {
    return actor.displayName.trim();
  }

  const snapshot = await adminDb.collection("users").doc(actor.uid).get();
  const data = snapshot.data();

  return (
    (data?.displayName as string | undefined)?.trim() ||
    (data?.username as string | undefined)?.trim() ||
    actor.email ||
    actor.uid
  );
}

async function resolveRegionName(regionId: string | null | undefined) {
  if (!regionId) {
    return "Global";
  }

  const snapshot = await adminDb.collection("regions").doc(regionId).get();

  if (!snapshot.exists) {
    return regionId;
  }

  return (snapshot.data()?.name as string | undefined) || regionId;
}

function buildActorLabel(role: StaffRole, actorName: string) {
  const roleLabel =
    role === "superadmin"
      ? "SuperAdmin"
      : role === "regionaladmin"
        ? "RegionalAdmin"
        : role === "doctor"
          ? "Doctor"
          : "Midwife";

  return `${roleLabel} - ${actorName}`;
}

export async function logAuditEvent({
  actor,
  module,
  actionType,
  action,
  target,
  regionId,
  metadata,
}: LogAuditEventInput) {
  try {
    const resolvedRegionId = regionId ?? actor.regionId ?? null;
    const [actorName, regionName] = await Promise.all([
      resolveActorName(actor),
      resolveRegionName(resolvedRegionId),
    ]);

    await adminDb.collection("auditLogs").add({
      actorUid: actor.uid,
      actorRole: actor.role,
      actorName,
      actorLabel: buildActorLabel(actor.role, actorName),
      regionId: resolvedRegionId,
      regionName,
      module,
      actionType,
      action,
      target,
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Audit logging should never break the primary action flow.
  }
}
