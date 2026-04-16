import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";

type CheckupStatus = "Overdue" | "Completed" | "Upcoming";
type RiskLevel = "Low" | "Moderate" | "High";

function formatRiskLevel(value: unknown): RiskLevel {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "moderate") return "Moderate";
  return "Low";
}

function parseLocalDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) return new Date(value);

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
  if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };

  return {
    date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`,
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
  };
}

function resolveStatus(rawStatus: unknown, scheduledAt: string): CheckupStatus {
  const normalized = String(rawStatus || "");
  if (normalized === "Completed") return "Completed";

  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) return "Upcoming";
  return parsed.getTime() < Date.now() ? "Overdue" : "Upcoming";
}

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);

  const motherSnapshots = await Promise.all(
    linkedDoctorUids.map((uid) =>
      adminDb.collection("mothers").where("assignedDoctorUid", "==", uid).get(),
    ),
  );

  const assignedMotherDocs = motherSnapshots.flatMap((snapshot) => snapshot.docs);

  if (assignedMotherDocs.length === 0) {
    return NextResponse.json({ checkups: [], mothers: [] });
  }

  const motherMap = new Map(
    assignedMotherDocs.map((doc) => {
      const data = doc.data();
      return [
        doc.id,
        {
          motherName: String(data.fullName || "Unknown Mother"),
          riskLevel: formatRiskLevel(data.riskLevel),
        },
      ];
    }),
  );

  const uids = assignedMotherDocs.map(doc => doc.id);
  const checkupBatches = await Promise.all(
    uids.reduce((resultArray, item, index) => { 
      const chunkIndex = Math.floor(index/10);
      if(!resultArray[chunkIndex]) { resultArray[chunkIndex] = []; }
      resultArray[chunkIndex].push(item);
      return resultArray;
    }, [] as string[][]).map((chunkUids) =>
      adminDb.collection("doctorCheckups").where("motherUid", "in", chunkUids).get()
    )
  );

  const checkups = checkupBatches.flatMap(snapshot => snapshot.docs).map(doc => {
    const data = doc.data();
    const mother = motherMap.get(String(data.motherUid || ""));
    const scheduledAt = String(data.scheduledAt || "");
    const { date, time } = splitDateTime(scheduledAt);

    return {
      id: doc.id,
      motherUid: String(data.motherUid || ""),
      motherName: mother?.motherName || String(data.motherName || "Unknown Mother"),
      riskLevel: mother?.riskLevel || formatRiskLevel(data.riskLevel),
      date,
      time,
      notes: String(data.notes || "No additional notes."),
      status: resolveStatus(data.status, scheduledAt),
      // Computed purely for existing frontend mock parity
      day: new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'short' }),
      duration: 1, 
      color: "mint" 
    };
  }).sort((left, right) =>
    `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
  );

  const mothersList = Array.from(motherMap.entries()).map(([uid, mother]) => ({
    uid,
    ...mother,
  }));

  return NextResponse.json({ checkups, mothers: mothersList });
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);
  const payload = await request.json();

  if (!payload.motherUid || !payload.dateTime) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const motherSnapshot = await adminDb.collection("mothers").doc(payload.motherUid).get();
  if (!motherSnapshot.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  const mother = motherSnapshot.data();
  const assignedDoctorUid = String(mother?.assignedDoctorUid || "");

  if (!linkedDoctorUids.includes(assignedDoctorUid)) {
    return NextResponse.json(
      { error: "You can only create checkups for your assigned mothers." },
      { status: 403 },
    );
  }

  const scheduledAt = parseLocalDateTime(payload.dateTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid checkup date." }, { status: 400 });
  }

  await adminDb.collection("doctorCheckups").add({
    motherUid: payload.motherUid,
    motherName: mother?.fullName || "Unknown Mother",
    riskLevel: formatRiskLevel(mother?.riskLevel),
    scheduledAt: scheduledAt.toISOString(),
    notes: String(payload.notes || "").trim() || "No additional notes.",
    status: scheduledAt.getTime() < Date.now() ? "Overdue" : "Upcoming",
    doctorUid: assignedDoctorUid || actor.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Checkups",
    actionType: "Create",
    action: "Created upcoming checkup",
    target: String(mother?.fullName || "Unknown Mother"),
    metadata: {
      motherUid: payload.motherUid,
      scheduledAt: scheduledAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);
  const payload = await request.json();

  if (!payload.id) {
    return NextResponse.json({ error: "Checkup ID is required." }, { status: 400 });
  }

  const checkupRef = adminDb.collection("doctorCheckups").doc(payload.id);
  const checkupSnapshot = await checkupRef.get();

  if (!checkupSnapshot.exists) {
    return NextResponse.json({ error: "Checkup not found." }, { status: 404 });
  }

  const checkup = checkupSnapshot.data();
  if (!linkedDoctorUids.includes(String(checkup?.doctorUid || ""))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (payload.dateTime !== undefined) {
    const scheduledAt = parseLocalDateTime(payload.dateTime);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid checkup date." }, { status: 400 });
    }
    updates.scheduledAt = scheduledAt.toISOString();
    updates.status = "Upcoming"; // Rescheduling marks it upcoming
  } else if (payload.status) {
    updates.status = payload.status;
  }

  if (payload.notes !== undefined) {
    updates.notes = String(payload.notes).trim() || "No additional notes.";
  }

  await checkupRef.update(updates);

  await logAuditEvent({
    actor,
    module: "Checkups",
    actionType: payload.status === "Completed" ? "Complete" : payload.dateTime ? "Reschedule" : "Update",
    action: payload.status === "Completed" ? "Marked checkup as completed" : payload.dateTime ? "Rescheduled checkup" : "Updated checkup",
    target: String(checkup?.motherName || "Unknown Mother"),
    metadata: {
      checkupId: payload.id,
      status: updates.status || checkup?.status || null,
      scheduledAt: updates.scheduledAt || checkup?.scheduledAt || null,
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleDelete(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);
  const payload = await request.json();

  if (!payload.id) {
    return NextResponse.json({ error: "Checkup ID is required." }, { status: 400 });
  }

  const checkupRef = adminDb.collection("doctorCheckups").doc(payload.id);
  const checkupSnapshot = await checkupRef.get();

  if (!checkupSnapshot.exists) {
    return NextResponse.json({ error: "Checkup not found." }, { status: 404 });
  }

  if (!linkedDoctorUids.includes(String(checkupSnapshot.data()?.doctorUid || ""))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await checkupRef.delete();

  await logAuditEvent({
    actor,
    module: "Checkups",
    actionType: "Delete",
    action: "Deleted checkup",
    target: String(checkupSnapshot.data()?.motherName || "Unknown Mother"),
    metadata: { checkupId: payload.id },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() { return handleList(); }
export async function POST(req: NextRequest) { return handleCreate(req); }
export async function PATCH(req: NextRequest) { return handleUpdate(req); }
export async function DELETE(req: NextRequest) { return handleDelete(req); }
