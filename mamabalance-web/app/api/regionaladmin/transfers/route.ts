import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  type DocumentData,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from "firebase-admin/firestore";

import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { logAuditEvent } from "@/lib/audit/log";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

type TransferType = "doctor" | "midwife" | "mother";
type TransferStatus = "pending" | "accepted" | "rejected";

const TRANSFER_TYPES = new Set<TransferType>(["doctor", "midwife", "mother"]);
const TRANSFER_STATUSES = new Set<TransferStatus>(["pending", "accepted", "rejected"]);

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

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function loadRegions() {
  const snapshot = await adminDb.collection("regions").get();

  if (snapshot.empty) {
    return DEFAULT_REGIONS;
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name || doc.id),
  }));
}

async function resolveRegionName(regionId: string | null | undefined) {
  if (!regionId) return "Unassigned";

  const snapshot = await adminDb.collection("regions").doc(regionId).get();
  return normalizeRegionName((snapshot.data()?.name as string | undefined) || regionId);
}

function resolveUserName(user: DocumentData | undefined, fallback = "Unknown user") {
  return (
    String(user?.displayName || "").trim() ||
    String(user?.fullName || "").trim() ||
    String(user?.username || "").trim() ||
    String(user?.email || "").trim() ||
    fallback
  );
}

function buildTransferRow(doc: QueryDocumentSnapshot<DocumentData>) {
  const data = doc.data();
  const status = TRANSFER_STATUSES.has(data.status as TransferStatus)
    ? (data.status as TransferStatus)
    : "pending";
  const type = TRANSFER_TYPES.has(data.type as TransferType)
    ? (data.type as TransferType)
    : "mother";

  return {
    id: doc.id,
    type,
    status,
    userUid: String(data.userUid || ""),
    userId: String(data.userId || ""),
    userName: String(data.userName || "Unknown user"),
    sourceRegionId: String(data.sourceRegionId || ""),
    sourceRegionName: String(data.sourceRegionName || "Source region"),
    targetRegionId: String(data.targetRegionId || ""),
    targetRegionName: String(data.targetRegionName || "Target region"),
    reason: String(data.reason || ""),
    requestedByName: String(data.requestedByName || "Regional Admin"),
    decidedByName: data.decidedByName ? String(data.decidedByName) : null,
    assignedMidwifeUid: data.assignedMidwifeUid ? String(data.assignedMidwifeUid) : null,
    assignedMidwifeName: data.assignedMidwifeName ? String(data.assignedMidwifeName) : null,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    decidedAt: toIsoString(data.decidedAt),
  };
}

async function notifyRegionalAdmins({
  regionId,
  title,
  message,
  transferId,
  transferType,
  priority = "medium",
}: {
  regionId: string;
  title: string;
  message: string;
  transferId: string;
  transferType: TransferType;
  priority?: "low" | "medium" | "high";
}) {
  const snapshot = await adminDb
    .collection("users")
    .where("role", "==", "regionaladmin")
    .get();

  const recipients = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.regionId === regionId && data.status === "active";
  });

  await Promise.all(
    recipients.map((doc) =>
      adminDb.collection("notifications").add({
        recipientUid: doc.id,
        recipientRole: "regionaladmin",
        type: "regional-transfer",
        title,
        message,
        transferId,
        transferType,
        priority,
        regionId,
        targetPath: "/regionaladmin/transfers",
        read: false,
        dismissed: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ),
  );
}

async function buildTransferableUsers(actorRegionId: string) {
  const [usersSnapshot, mothersSnapshot] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("mothers").get(),
  ]);
  const motherMap = new Map(mothersSnapshot.docs.map((doc) => [doc.id, doc.data()]));

  return usersSnapshot.docs
    .map((doc) => {
      const user = doc.data();
      const type = user.role as TransferType;

      if (!TRANSFER_TYPES.has(type) || user.regionId !== actorRegionId) {
        return null;
      }

      const mother = type === "mother" ? motherMap.get(doc.id) : undefined;

      return {
        uid: doc.id,
        type,
        userId: String(user.userId || mother?.userId || doc.id),
        name:
          type === "mother"
            ? resolveUserName({ ...user, displayName: mother?.fullName || user.displayName })
            : resolveUserName(user),
        contact: String(user.phoneNumber || mother?.phoneNumber || "-"),
        assignedMidwifeUid:
          type === "mother" && mother?.assignedMidwifeUid
            ? String(mother.assignedMidwifeUid)
            : null,
        guardianName:
          type === "mother" && mother?.guardianName ? String(mother.guardianName) : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function buildRegionalMidwives(actorRegionId: string) {
  const snapshot = await adminDb
    .collection("users")
    .where("role", "==", "midwife")
    .get();

  return snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return data.regionId === actorRegionId && data.status === "active";
    })
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        userId: String(data.userId || doc.id),
        name: resolveUserName(data, doc.id),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin" || !actor.regionId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [regions, users, midwives, transfersSnapshot] = await Promise.all([
    loadRegions(),
    buildTransferableUsers(actor.regionId),
    buildRegionalMidwives(actor.regionId),
    adminDb.collection("regionTransfers").get(),
  ]);

  const actorRegionName = normalizeRegionName(
    regions.find((region) => region.id === actor.regionId)?.name || actor.regionId,
  );
  const transferRows = transfersSnapshot.docs
    .map(buildTransferRow)
    .filter(
      (transfer) =>
        transfer.sourceRegionId === actor.regionId ||
        transfer.targetRegionId === actor.regionId,
    )
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

  return NextResponse.json({
    actorRegionId: actor.regionId,
    actorRegionName,
    regions: regions.filter((region) => region.id !== actor.regionId),
    users,
    targetMidwives: midwives,
    incoming: transferRows.filter((transfer) => transfer.targetRegionId === actor.regionId),
    outgoing: transferRows.filter((transfer) => transfer.sourceRegionId === actor.regionId),
  });
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin" || !actor.regionId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    type?: TransferType;
    userUid?: string;
    targetRegionId?: string;
    reason?: string;
  };

  const type = payload.type;
  const userUid = String(payload.userUid || "").trim();
  const targetRegionId = String(payload.targetRegionId || "").trim();
  const reason = String(payload.reason || "").trim();

  if (!type || !TRANSFER_TYPES.has(type)) {
    return NextResponse.json({ error: "Transfer type is required." }, { status: 400 });
  }

  if (!userUid) {
    return NextResponse.json({ error: "Select a user to transfer." }, { status: 400 });
  }

  if (!targetRegionId || targetRegionId === actor.regionId) {
    return NextResponse.json({ error: "Select a different target region." }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "Transfer reason is required." }, { status: 400 });
  }

  const [userSnapshot, pendingSnapshot] = await Promise.all([
    adminDb.collection("users").doc(userUid).get(),
    adminDb.collection("regionTransfers").where("userUid", "==", userUid).get(),
  ]);

  if (!userSnapshot.exists) {
    return NextResponse.json({ error: "Selected user was not found." }, { status: 404 });
  }

  const user = userSnapshot.data();

  if (user?.role !== type || user?.regionId !== actor.regionId) {
    return NextResponse.json(
      { error: "Regional admins can only transfer users from their own region." },
      { status: 403 },
    );
  }

  const hasPendingTransfer = pendingSnapshot.docs.some(
    (doc) => doc.data().status === "pending",
  );

  if (hasPendingTransfer) {
    return NextResponse.json(
      { error: "This user already has a pending transfer request." },
      { status: 400 },
    );
  }

  const [sourceRegionName, targetRegionName, motherSnapshot] = await Promise.all([
    resolveRegionName(actor.regionId),
    resolveRegionName(targetRegionId),
    type === "mother"
      ? adminDb.collection("mothers").doc(userUid).get()
      : Promise.resolve(null),
  ]);
  const mother = motherSnapshot?.data();

  if (type === "mother" && !motherSnapshot?.exists) {
    return NextResponse.json({ error: "Mother profile was not found." }, { status: 404 });
  }

  const userName =
    type === "mother"
      ? resolveUserName({ ...user, displayName: mother?.fullName || user?.displayName })
      : resolveUserName(user);
  const transferRef = adminDb.collection("regionTransfers").doc();

  await transferRef.set({
    type,
    status: "pending",
    userUid,
    userId: String(user?.userId || mother?.userId || userUid),
    userName,
    guardianUid: type === "mother" ? mother?.guardianUid || null : null,
    guardianName: type === "mother" ? mother?.guardianName || null : null,
    sourceRegionId: actor.regionId,
    sourceRegionName,
    targetRegionId,
    targetRegionName,
    reason,
    requestedByUid: actor.uid,
    requestedByName: actor.displayName || actor.email || "Regional Admin",
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyRegionalAdmins({
    regionId: targetRegionId,
    transferId: transferRef.id,
    transferType: type,
    title: `Incoming ${titleCase(type)} Transfer`,
    message: `${userName} was referred from ${sourceRegionName}. Review and ${type === "mother" ? "assign a midwife before accepting" : "accept the transfer"}.`,
    priority: "high",
  });

  await logAuditEvent({
    actor,
    module: "Users",
    actionType: "Update",
    action: `Requested ${type} regional transfer`,
    target: userName,
    regionId: actor.regionId,
    metadata: {
      transferId: transferRef.id,
      targetRegionId,
      reason,
    },
  });

  return NextResponse.json({ ok: true, id: transferRef.id });
}

async function clearMovedStaffAssignments(
  batch: WriteBatch,
  field: "assignedDoctorUid" | "assignedMidwifeUid",
  uid: string,
) {
  const snapshot = await adminDb.collection("mothers").where(field, "==", uid).get();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      [field]: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function handleDecision(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin" || !actor.regionId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    action?: "accept" | "reject";
    assignedMidwifeUid?: string;
  };
  const id = String(payload.id || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Transfer ID is required." }, { status: 400 });
  }

  if (payload.action !== "accept" && payload.action !== "reject") {
    return NextResponse.json({ error: "Unsupported transfer decision." }, { status: 400 });
  }

  const transferRef = adminDb.collection("regionTransfers").doc(id);
  const transferSnapshot = await transferRef.get();

  if (!transferSnapshot.exists) {
    return NextResponse.json({ error: "Transfer request not found." }, { status: 404 });
  }

  const transfer = transferSnapshot.data();
  const type = transfer?.type as TransferType;

  if (
    !TRANSFER_TYPES.has(type) ||
    transfer?.targetRegionId !== actor.regionId ||
    transfer?.status !== "pending"
  ) {
    return NextResponse.json({ error: "This transfer cannot be updated here." }, { status: 403 });
  }

  const userUid = String(transfer.userUid || "");
  const userSnapshot = await adminDb.collection("users").doc(userUid).get();

  if (!userSnapshot.exists) {
    return NextResponse.json({ error: "Transfer user was not found." }, { status: 404 });
  }

  const decidedByName = actor.displayName || actor.email || "Regional Admin";
  const batch = adminDb.batch();
  let assignedMidwifeName: string | null = null;
  let acceptedMidwifeUid: string | null = null;

  if (payload.action === "accept") {
    if (type === "mother") {
      const assignedMidwifeUid = String(payload.assignedMidwifeUid || "").trim();

      if (!assignedMidwifeUid) {
        return NextResponse.json(
          { error: "Assign a target-region midwife before accepting this mother transfer." },
          { status: 400 },
        );
      }

      const midwifeSnapshot = await adminDb.collection("users").doc(assignedMidwifeUid).get();
      const midwife = midwifeSnapshot.data();

      if (
        !midwifeSnapshot.exists ||
        midwife?.role !== "midwife" ||
        midwife?.regionId !== actor.regionId ||
        midwife?.status !== "active"
      ) {
        return NextResponse.json(
          { error: "Selected midwife must be active in your region." },
          { status: 400 },
        );
      }

      assignedMidwifeName = resolveUserName(midwife, assignedMidwifeUid);
      acceptedMidwifeUid = assignedMidwifeUid;

      const motherSnapshot = await adminDb.collection("mothers").doc(userUid).get();

      if (!motherSnapshot.exists) {
        return NextResponse.json({ error: "Mother profile was not found." }, { status: 404 });
      }

      batch.update(adminDb.collection("users").doc(userUid), {
        regionId: actor.regionId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(
        adminDb.collection("mothers").doc(userUid),
        {
          regionId: actor.regionId,
          assignedMidwifeUid,
          assignedDoctorUid: null,
          transferAcceptedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const guardianUid = String(motherSnapshot.data()?.guardianUid || transfer.guardianUid || "");

      if (guardianUid) {
        batch.set(
          adminDb.collection("users").doc(guardianUid),
          {
            regionId: actor.regionId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else {
      batch.update(adminDb.collection("users").doc(userUid), {
        regionId: actor.regionId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (type === "doctor") {
        await clearMovedStaffAssignments(batch, "assignedDoctorUid", userUid);
      }

      if (type === "midwife") {
        await clearMovedStaffAssignments(batch, "assignedMidwifeUid", userUid);
      }
    }
  }

  batch.update(transferRef, {
    status: payload.action === "accept" ? "accepted" : "rejected",
    decidedByUid: actor.uid,
    decidedByName,
    decidedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(assignedMidwifeName && {
      assignedMidwifeUid: acceptedMidwifeUid,
      assignedMidwifeName,
    }),
  });

  await batch.commit();

  const userName = String(transfer.userName || resolveUserName(userSnapshot.data()));
  const statusLabel = payload.action === "accept" ? "accepted" : "rejected";

  await notifyRegionalAdmins({
    regionId: String(transfer.sourceRegionId || ""),
    transferId: id,
    transferType: type,
    title: `${titleCase(type)} Transfer ${titleCase(statusLabel)}`,
    message: `${actor.displayName || "The receiving regional admin"} ${statusLabel} the transfer for ${userName}.`,
    priority: payload.action === "accept" ? "medium" : "high",
  });

  await logAuditEvent({
    actor,
    module: "Users",
    actionType: "Update",
    action: `${titleCase(statusLabel)} ${type} regional transfer`,
    target: userName,
    regionId: actor.regionId,
    metadata: {
      transferId: id,
      sourceRegionId: transfer.sourceRegionId || null,
      assignedMidwifeUid: acceptedMidwifeUid,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return handleList();
}

export async function POST(request: NextRequest) {
  return handleCreate(request);
}

export async function PATCH(request: NextRequest) {
  return handleDecision(request);
}
