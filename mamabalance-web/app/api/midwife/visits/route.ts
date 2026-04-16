import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import {
  loadMidwifeCollectionByLinkedUids,
  loadMidwifeMothersByLinkedUids,
  resolveLinkedMidwifeUids,
} from "@/lib/midwife/identity";

type VisitType = "home" | "clinic";
type VisitStatus = "Overdue" | "Upcoming" | "Rescheduled" | "Completed";

type MotherOption = {
  uid: string;
  motherName: string;
  riskLevel: "Low" | "Moderate" | "High";
};

type VisitItem = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: "Low" | "Moderate" | "High";
  visitType: VisitType;
  date: string;
  time: string;
  notes: string;
  status: VisitStatus;
};

function formatRiskLevel(value: unknown): "Low" | "Moderate" | "High" {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "moderate") return "Moderate";
  return "Low";
}

function parseLocalDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hours, minutes, seconds] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds || "0"),
  );
}

function splitDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { date: "-", time: "-" };
  }

  return {
    date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
      parsed.getDate(),
    ).padStart(2, "0")}`,
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(
      parsed.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

function resolveVisitStatus(rawStatus: unknown, scheduledAt: string): VisitStatus {
  const normalized = String(rawStatus || "");

  if (normalized === "Completed" || normalized === "Rescheduled") {
    return normalized;
  }

  const parsed = new Date(scheduledAt);

  if (Number.isNaN(parsed.getTime())) {
    return "Upcoming";
  }

  return parsed.getTime() < Date.now() ? "Overdue" : "Upcoming";
}

function buildMotherOptions(mothers: { uid: string; data: DocumentData }[]): MotherOption[] {
  return mothers
    .map(({ uid, data }) => ({
      uid,
      motherName: (data.fullName as string | undefined) || "Unknown Mother",
      riskLevel: formatRiskLevel(data.riskLevel),
    }))
    .sort((left, right) => left.motherName.localeCompare(right.motherName));
}

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);
  const [assignedMothers, visitSnapshot] = await Promise.all([
    loadMidwifeMothersByLinkedUids(linkedMidwifeUids),
    loadMidwifeCollectionByLinkedUids("midwifeVisits", "midwifeUid", linkedMidwifeUids),
  ]);

  const motherMap = new Map(
    assignedMothers.map(({ uid, data }) => [
      uid,
      {
        motherName: (data.fullName as string | undefined) || "Unknown Mother",
        riskLevel: formatRiskLevel(data.riskLevel),
      },
    ]),
  );

  const visits = visitSnapshot
    .map(({ id, data }) => {
      const mother = motherMap.get(String(data.motherUid || ""));
      const scheduledAt = String(data.scheduledAt || "");
      const { date, time } = splitDateTime(scheduledAt);

      return {
        id,
        motherUid: String(data.motherUid || ""),
        motherName: mother?.motherName || String(data.motherName || "Unknown Mother"),
        riskLevel: mother?.riskLevel || formatRiskLevel(data.riskLevel),
        visitType: data.visitType === "clinic" ? "clinic" : "home",
        date,
        time,
        notes: String(data.notes || "No additional notes."),
        status: resolveVisitStatus(data.status, scheduledAt),
      } satisfies VisitItem;
    })
    .sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
    );

  return NextResponse.json({
    visits,
    mothers: buildMotherOptions(assignedMothers),
  });
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  const payload = (await request.json()) as {
    motherUid?: string;
    visitType?: VisitType;
    dateTime?: string;
    notes?: string;
  };

  if (!payload.motherUid || !payload.visitType || !payload.dateTime) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const motherSnapshot = await adminDb.collection("mothers").doc(payload.motherUid).get();

  if (!motherSnapshot.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  const mother = motherSnapshot.data();

  const assignedMidwifeUid = String(mother?.assignedMidwifeUid || "");

  if (!linkedMidwifeUids.includes(assignedMidwifeUid)) {
    return NextResponse.json(
      { error: "You can only create visits for your assigned mothers." },
      { status: 403 },
    );
  }

  const scheduledAt = parseLocalDateTime(payload.dateTime);

  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid visit date." }, { status: 400 });
  }

  await adminDb.collection("midwifeVisits").add({
    motherUid: payload.motherUid,
    motherName: mother?.fullName || "Unknown Mother",
    riskLevel: formatRiskLevel(mother?.riskLevel),
    visitType: payload.visitType,
    scheduledAt: scheduledAt.toISOString(),
    notes: String(payload.notes || "").trim() || "No additional notes.",
    status: scheduledAt.getTime() < Date.now() ? "Overdue" : "Upcoming",
    midwifeUid: assignedMidwifeUid || actor.uid,
    regionId: actor.regionId || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Visits",
    actionType: "Create",
    action: `Created ${payload.visitType} visit`,
    target: String(mother?.fullName || "Unknown Mother"),
    regionId: actor.regionId ?? null,
    metadata: {
      motherUid: payload.motherUid,
      visitType: payload.visitType,
      scheduledAt: scheduledAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  const payload = (await request.json()) as {
    id?: string;
    dateTime?: string;
    notes?: string;
    status?: VisitStatus;
  };

  if (!payload.id) {
    return NextResponse.json({ error: "Visit ID is required." }, { status: 400 });
  }

  const visitRef = adminDb.collection("midwifeVisits").doc(payload.id);
  const visitSnapshot = await visitRef.get();

  if (!visitSnapshot.exists) {
    return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  }

  const visit = visitSnapshot.data();

  if (!linkedMidwifeUids.includes(String(visit?.midwifeUid || ""))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (payload.dateTime !== undefined) {
  const scheduledAt = parseLocalDateTime(payload.dateTime);

    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid visit date." }, { status: 400 });
    }

    updates.scheduledAt = scheduledAt.toISOString();
    updates.status = payload.status || "Rescheduled";
  } else if (payload.status) {
    updates.status = payload.status;
  }

  if (payload.notes !== undefined) {
    updates.notes = String(payload.notes).trim() || "No additional notes.";
  }

  await visitRef.update(updates);

  const targetMother = String(visit?.motherName || "Unknown Mother");
  const resolvedActionType =
    payload.status === "Completed"
      ? "Complete"
      : payload.dateTime !== undefined
        ? "Reschedule"
        : "Update";
  const resolvedAction =
    payload.status === "Completed"
      ? "Marked visit as completed"
      : payload.dateTime !== undefined
        ? "Rescheduled visit"
        : "Updated visit";

  await logAuditEvent({
    actor,
    module: "Visits",
    actionType: resolvedActionType,
    action: resolvedAction,
    target: targetMother,
    regionId: actor.regionId ?? null,
    metadata: {
      visitId: payload.id,
      motherUid: visit?.motherUid || null,
      status: updates.status || visit?.status || null,
      scheduledAt: updates.scheduledAt || visit?.scheduledAt || null,
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleDelete(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  const payload = (await request.json()) as { id?: string };

  if (!payload.id) {
    return NextResponse.json({ error: "Visit ID is required." }, { status: 400 });
  }

  const visitRef = adminDb.collection("midwifeVisits").doc(payload.id);
  const visitSnapshot = await visitRef.get();

  if (!visitSnapshot.exists) {
    return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  }

  if (!linkedMidwifeUids.includes(String(visitSnapshot.data()?.midwifeUid || ""))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const visit = visitSnapshot.data();
  await visitRef.delete();

  await logAuditEvent({
    actor,
    module: "Visits",
    actionType: "Delete",
    action: "Deleted visit",
    target: String(visit?.motherName || "Unknown Mother"),
    regionId: actor.regionId ?? null,
    metadata: {
      visitId: payload.id,
      motherUid: visit?.motherUid || null,
      visitType: visit?.visitType || null,
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
  return handleUpdate(request);
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}
