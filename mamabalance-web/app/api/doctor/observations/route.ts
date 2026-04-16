import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";

type VisitSource = "doctor" | "homeVisit" | "clinicVisit";
type RiskLevel = "Low" | "Moderate" | "High";

type ObservationRecord = {
  id: string;
  source: VisitSource;
  motherUid: string;
  motherName: string;
  motherUsername: string;
  timestamp: string;
  observedAt: string;
  title: string;
  note: string;
  riskLevel: RiskLevel;
  mood: string;
  sleep: string;
  appetite: string;
  additional: string;
  upcomingCheckup: string;
  observedBy: string;
};

function formatRiskLevel(value: unknown): RiskLevel {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "moderate") return "Moderate";
  return "Low";
}

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateTimeLocalValue(value: unknown) {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return new Date(value);
  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds || "0"));
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function mapObservation(
  id: string,
  data: DocumentData,
  source: VisitSource,
  motherMap: Map<string, { name: string; username: string; riskLevel: RiskLevel }>,
  midwifeMap?: Map<string, string>,
): ObservationRecord {
  const mother = motherMap.get(String(data.motherUid || ""));
  
  let observedBy = String(data.observedBy || (source === "doctor" ? "Doctor" : "Midwife"));
  
  if (source === "doctor") {
    if (observedBy !== "Doctor" && !observedBy.startsWith("Dr. ")) {
      observedBy = `Dr. ${observedBy}`;
    }
  } else {
    const midwifeUid = String(data.midwifeUid || "");
    const resolvedName = midwifeMap?.get(midwifeUid);
    if (resolvedName) {
      observedBy = `Midwife ${resolvedName}`;
    } else {
      if (observedBy !== "Midwife" && !observedBy.startsWith("Midwife ")) {
        observedBy = `Midwife ${observedBy}`;
      } else if (!observedBy.startsWith("Midwife")) {
        observedBy = "Midwife";
      }
    }
  }

  return {
    id,
    source,
    motherUid: String(data.motherUid || ""),
    motherName: mother?.name || String(data.motherName || "Unknown Mother"),
    motherUsername: mother?.username || String(data.motherUsername || "-"),
    timestamp: formatDateTime(data.observedAt || data.createdAt),
    observedAt: toDateTimeLocalValue(data.observedAt || data.createdAt),
    title: String(data.title || "-"),
    note: String(data.note || ""),
    riskLevel: mother?.riskLevel || formatRiskLevel(data.riskLevel),
    mood: String(data.mood || "Normal"),
    sleep: String(data.sleep || "Moderate"),
    appetite: String(data.appetite || "Good"),
    additional: String(data.additional || "-"),
    upcomingCheckup: formatDateTime(data.nextObservationAt),
    observedBy,
  };
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
    return NextResponse.json({ observations: [] });
  }

  const userSnapshots = await Promise.all(
    assignedMotherDocs.map((doc) => adminDb.collection("users").doc(doc.id).get()),
  );
  const userMap = new Map(userSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));

  const motherMap = new Map(
    assignedMotherDocs.map((doc) => {
      const parentUser = userMap.get(doc.id);
      const data = doc.data();
      return [
        doc.id,
        {
          name: String(data.fullName || parentUser?.displayName || "Unknown Mother"),
          username: String(data.username || parentUser?.username || "-"),
          riskLevel: formatRiskLevel(data.riskLevel),
        },
      ];
    }),
  );

  const uids = assignedMotherDocs.map(doc => doc.id);

  const [careObservationBatches, midwifeObservationBatches] = await Promise.all([
    Promise.all(
      chunk(uids, 10).map((chunkUids) =>
        adminDb.collection("careObservations").where("motherUid", "in", chunkUids).where("authorRole", "==", "doctor").get()
      )
    ),
    Promise.all(
      chunk(uids, 10).map((chunkUids) =>
        adminDb.collection("midwifeObservations").where("motherUid", "in", chunkUids).get()
      )
    )
  ]);

  const uniqueMidwifeUids = new Set<string>();
  midwifeObservationBatches.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const midwifeUid = String(doc.data().midwifeUid || "");
      if (midwifeUid) uniqueMidwifeUids.add(midwifeUid);
    });
  });

  const midwifeUidArray = Array.from(uniqueMidwifeUids);
  const midwifeSnapshots = await Promise.all(
    midwifeUidArray.map(uid => adminDb.collection("users").doc(uid).get())
  );
  
  const midwifeMap = new Map<string, string>();
  midwifeSnapshots.forEach(doc => {
    if (doc.exists) {
      midwifeMap.set(doc.id, String(doc.data()?.displayName || "Midwife"));
    }
  });

  const observations: ObservationRecord[] = [];

  careObservationBatches.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      observations.push(mapObservation(doc.id, doc.data(), "doctor", motherMap));
    });
  });

  midwifeObservationBatches.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const source = data.source === "clinicVisit" ? "clinicVisit" : "homeVisit";
      observations.push(mapObservation(doc.id, data, source, motherMap, midwifeMap));
    });
  });

  observations.sort((left, right) => right.observedAt.localeCompare(left.observedAt));

  return NextResponse.json({ observations });
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);

  const payload = (await request.json()) as {
    motherUid?: string;
    title?: string;
    note?: string;
    mood?: string;
    sleep?: string;
    appetite?: string;
    additional?: string;
    upcomingCheckup?: string;
  };

  if (!payload.motherUid || !payload.title?.trim() || !payload.note?.trim() || !payload.upcomingCheckup) {
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
      { error: "You can only add observations for your assigned mothers." },
      { status: 403 },
    );
  }

  const nextObservationAt = parseLocalDateTime(payload.upcomingCheckup);

  if (Number.isNaN(nextObservationAt.getTime())) {
    return NextResponse.json({ error: "Invalid next observation date." }, { status: 400 });
  }

  const userDoc = await adminDb.collection("users").doc(actor.uid).get();
  const doctorName = userDoc.exists ? String(userDoc.data()?.displayName || "Doctor") : "Doctor";

  await adminDb.collection("careObservations").add({
    motherUid: payload.motherUid,
    motherName: String(mother?.fullName || "Unknown Mother"),
    motherUsername: String(mother?.username || "-"),
    riskLevel: formatRiskLevel(mother?.riskLevel),
    authorRole: "doctor",
    title: String(payload.title).trim(),
    note: String(payload.note).trim(),
    mood: String(payload.mood || "Normal"),
    sleep: String(payload.sleep || "Moderate"),
    appetite: String(payload.appetite || "Good"),
    additional: String(payload.additional || "").trim() || "-",
    nextObservationAt: nextObservationAt.toISOString(),
    observedAt: new Date().toISOString(),
    doctorId: assignedDoctorUid || actor.uid,
    observedBy: doctorName,
    regionId: actor.regionId || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Observations",
    actionType: "Create",
    action: "Added doctor observation",
    target: String(mother?.fullName || "Unknown Mother"),
    regionId: actor.regionId ?? null,
    metadata: {
      motherUid: payload.motherUid,
      source: "doctor",
      title: String(payload.title).trim(),
      nextObservationAt: nextObservationAt.toISOString(),
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

  const payload = (await request.json()) as {
    id?: string;
    motherUid?: string;
    title?: string;
    note?: string;
    mood?: string;
    sleep?: string;
    appetite?: string;
    additional?: string;
    upcomingCheckup?: string;
  };

  if (!payload.id || !payload.motherUid || !payload.upcomingCheckup) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const observationRef = adminDb.collection("careObservations").doc(payload.id);
  const [observationSnapshot, motherSnapshot] = await Promise.all([
    observationRef.get(),
    adminDb.collection("mothers").doc(payload.motherUid).get(),
  ]);

  if (!observationSnapshot.exists) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  if (!motherSnapshot.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  const observation = observationSnapshot.data();
  const mother = motherSnapshot.data();

  if (observation?.authorRole !== "doctor") {
    return NextResponse.json({ error: "Cannot modify this observation." }, { status: 403 });
  }

  if (
    !linkedDoctorUids.includes(String(observation?.doctorId || "")) ||
    !linkedDoctorUids.includes(String(mother?.assignedDoctorUid || ""))
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const nextObservationAt = parseLocalDateTime(payload.upcomingCheckup);

  if (Number.isNaN(nextObservationAt.getTime())) {
    return NextResponse.json({ error: "Invalid next observation date." }, { status: 400 });
  }

  await observationRef.update({
    motherUid: payload.motherUid,
    motherName: String(mother?.fullName || "Unknown Mother"),
    motherUsername: String(mother?.username || "-"),
    riskLevel: formatRiskLevel(mother?.riskLevel),
    title: String(payload.title || "").trim(),
    note: String(payload.note || "").trim(),
    mood: String(payload.mood || "Normal"),
    sleep: String(payload.sleep || "Moderate"),
    appetite: String(payload.appetite || "Good"),
    additional: String(payload.additional || "").trim() || "-",
    nextObservationAt: nextObservationAt.toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Observations",
    actionType: "Update",
    action: "Updated doctor observation",
    target: String(mother?.fullName || "Unknown Mother"),
    regionId: actor.regionId ?? null,
    metadata: {
      observationId: payload.id,
      motherUid: payload.motherUid,
      source: "doctor",
      title: String(payload.title || "").trim(),
      nextObservationAt: nextObservationAt.toISOString(),
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
