import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { formatDate } from "@/lib/admin/format";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import {
  loadMidwifeCollectionByLinkedUids,
  resolveLinkedMidwifeUids,
} from "@/lib/midwife/identity";
import {
  MidwifeDoctorOption,
  MidwifeMotherRecord,
} from "@/lib/midwife/types";

type Scope = "assigned" | "high-risk";

type MidwifeVisitStatus = "Overdue" | "Upcoming" | "Rescheduled" | "Completed";

function getRiskLevel(mother: DocumentData) {
  const explicit = String(mother.riskLevel || "").toLowerCase();

  if (explicit === "high" || explicit === "moderate" || explicit === "low") {
    return explicit as MidwifeMotherRecord["risk"];
  }

  if (mother.isHighRisk) {
    return "high";
  }

  const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);

  if (latestEpdsScore >= 20) {
    return "high";
  }

  if (latestEpdsScore >= 10) {
    return "moderate";
  }

  return "low";
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

function resolveLatestEpdsAttemptDate(mother: DocumentData, user: DocumentData | undefined) {
  return (
    mother.latestEpdsSubmittedAt ??
    mother.latestEpdsAttemptedAt ??
    mother.latestEpdsCreatedAt ??
    mother.updatedAt ??
    user?.updatedAt ??
    mother.createdAt ??
    user?.createdAt
  );
}

function resolveVisitStatus(rawStatus: unknown, scheduledAt: string): MidwifeVisitStatus {
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

function mapVisitStatusToMotherStatus(
  status: MidwifeVisitStatus,
): MidwifeMotherRecord["lastStatus"] {
  if (status === "Overdue") return "overdue";
  if (status === "Completed") return "completed";
  return "upcoming";
}

function buildVisitLookup(visitDocs: Array<{ id: string; data: DocumentData }>) {
  const grouped = new Map<
    string,
    Array<{
      scheduledAt: string;
      status: MidwifeVisitStatus;
    }>
  >();

  visitDocs.forEach(({ data }) => {
    const motherUid = String(data.motherUid || "");
    const scheduledAt = String(data.scheduledAt || "");

    if (!motherUid || !scheduledAt) {
      return;
    }

    const current = grouped.get(motherUid) || [];
    current.push({
      scheduledAt,
      status: resolveVisitStatus(data.status, scheduledAt),
    });
    grouped.set(motherUid, current);
  });

  const lookup = new Map<
    string,
    {
      upcomingCheckup: string;
      lastStatus: MidwifeMotherRecord["lastStatus"];
    }
  >();

  grouped.forEach((visits, motherUid) => {
    const sorted = [...visits].sort((left, right) =>
      left.scheduledAt.localeCompare(right.scheduledAt),
    );
    const preferred =
      sorted.find(
        (visit) =>
          visit.status === "Upcoming" ||
          visit.status === "Rescheduled",
      ) ||
      sorted.find(
        (visit) =>
          visit.status === "Overdue",
      ) || sorted[sorted.length - 1];

    lookup.set(motherUid, {
      upcomingCheckup: formatDateTime(preferred?.scheduledAt),
      lastStatus: mapVisitStatusToMotherStatus(preferred?.status || "Upcoming"),
    });
  });

  return lookup;
}

async function loadRegionMap() {
  const snapshot = await adminDb.collection("regions").get();

  if (snapshot.empty) {
    return new Map(DEFAULT_REGIONS.map((region) => [region.id, region.name]));
  }

  return new Map(
    snapshot.docs.map((doc) => [
      doc.id,
      (doc.data().name as string | undefined) || doc.id,
    ]),
  );
}

async function loadDoctorOptions(regionId: string | null | undefined) {
  let query = adminDb
    .collection("users")
    .where("role", "==", "doctor")
    .where("status", "==", "active");

  if (regionId) {
    query = query.where("regionId", "==", regionId);
  }

  const snapshot = await query.get();

  return snapshot.docs
    .map((doc) => ({
      uid: doc.id,
      name: (doc.data().displayName as string | undefined) || "Unknown Doctor",
    }))
    .sort((left, right) => left.name.localeCompare(right.name)) satisfies MidwifeDoctorOption[];
}

function buildMotherRecord(
  uid: string,
  user: DocumentData | undefined,
  mother: DocumentData,
  regionMap: Map<string, string>,
  doctorMap: Map<string, string>,
  visitLookup: Map<
    string,
    {
      upcomingCheckup: string;
      lastStatus: MidwifeMotherRecord["lastStatus"];
    }
  >,
): MidwifeMotherRecord {
  const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
  const risk = getRiskLevel(mother);
  const assignedDoctorUid =
    (mother.assignedDoctorUid as string | undefined) || null;
  const assignedDoctor = assignedDoctorUid
    ? doctorMap.get(assignedDoctorUid) || "Unknown Doctor"
    : null;
  const visitSummary = visitLookup.get(uid);

  return {
    uid,
    userId:
      (mother.userId as string | undefined) ||
      (user?.userId as string | undefined) ||
      "-",
    username:
      (mother.username as string | undefined) ||
      (user?.username as string | undefined) ||
      "-",
    name:
      (mother.fullName as string | undefined) ||
      (user?.displayName as string | undefined) ||
      "-",
    risk,
    upcomingCheckup: visitSummary?.upcomingCheckup || "-",
    lastStatus: visitSummary?.lastStatus || "upcoming",
    lastEPDS: String(latestEpdsScore),
    lastEPDSTestDate:
      latestEpdsScore > 0
        ? formatDateTime(resolveLatestEpdsAttemptDate(mother, user))
        : "-",
    assignedDoctor,
    assignedDoctorUid,
    assignedAt: assignedDoctorUid
      ? formatDateTime(mother.assignedDoctorAssignedAt ?? mother.updatedAt)
      : null,
    nic:
      (mother.nic as string | undefined) ||
      (user?.nic as string | undefined) ||
      "-",
    email:
      (mother.personalEmail as string | undefined) ||
      (user?.personalEmail as string | undefined) ||
      (mother.email as string | undefined) ||
      (user?.email as string | undefined) ||
      "-",
    region: normalizeRegionName(
      regionMap.get(String(mother.regionId || user?.regionId || "")) ||
        (user?.regionName as string | undefined),
    ),
    contact:
      (mother.phoneNumber as string | undefined) ||
      (user?.phoneNumber as string | undefined) ||
      "-",
    birthday: formatDate(mother.birthdate),
    address: (mother.address as string | undefined) || "-",
    guardianName: (mother.guardianName as string | undefined) || "-",
    guardianContact: (mother.guardianContact as string | undefined) || "-",
    deliveryDate: formatDate(mother.deliveryDate),
    children: String(mother.noOfChildren ?? 0),
    epdsTrend: latestEpdsScore > 0 ? [latestEpdsScore] : [],
    observations: [],
    activeMedications: [],
    medicationHistory: [],
  };
}

async function handleList(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  const scope = (request.nextUrl.searchParams.get("scope") || "assigned") as Scope;

  if (scope !== "assigned" && scope !== "high-risk") {
    return NextResponse.json({ error: "Invalid scope." }, { status: 400 });
  }

  const [regionMap, doctorOptions, motherSnapshot] = await Promise.all([
    loadRegionMap(),
    loadDoctorOptions(actor.regionId),
    adminDb.collection("mothers").where("assignedMidwifeUid", "in", linkedMidwifeUids).get(),
  ]);

  const visitSnapshot = await loadMidwifeCollectionByLinkedUids(
    "midwifeVisits",
    "midwifeUid",
    linkedMidwifeUids,
  );

  const userSnapshots = await Promise.all(
    motherSnapshot.docs.map((doc) =>
      adminDb.collection("users").doc(doc.id).get(),
    ),
  );

  const userMap = new Map(
    userSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );
  const doctorMap = new Map(doctorOptions.map((doctor) => [doctor.uid, doctor.name]));
  const visitLookup = buildVisitLookup(
    visitSnapshot,
  );

  const mothers = motherSnapshot.docs
    .map((doc) =>
      buildMotherRecord(
        doc.id,
        userMap.get(doc.id),
        doc.data(),
        regionMap,
        doctorMap,
        visitLookup,
      ),
    )
    .filter((mother) => (scope === "high-risk" ? mother.risk === "high" : true));

  return NextResponse.json({ mothers, doctors: doctorOptions });
}

async function handleAssignDoctor(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);

  const payload = (await request.json()) as {
    motherUid?: string;
    doctorUid?: string;
  };

  if (!payload.motherUid || !payload.doctorUid) {
    return NextResponse.json(
      { error: "Mother and doctor are required." },
      { status: 400 },
    );
  }

  const motherRef = adminDb.collection("mothers").doc(payload.motherUid);
  const [motherSnapshot, doctorSnapshot] = await Promise.all([
    motherRef.get(),
    adminDb.collection("users").doc(payload.doctorUid).get(),
  ]);

  if (!motherSnapshot.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  if (!doctorSnapshot.exists) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  const mother = motherSnapshot.data();
  const doctor = doctorSnapshot.data();

  if (!linkedMidwifeUids.includes(String(mother?.assignedMidwifeUid || ""))) {
    return NextResponse.json(
      { error: "You can only manage your assigned mothers." },
      { status: 403 },
    );
  }

  if (doctor?.role !== "doctor" || doctor?.status !== "active") {
    return NextResponse.json(
      { error: "Selected doctor is unavailable." },
      { status: 400 },
    );
  }

  if (actor.regionId && doctor?.regionId !== actor.regionId) {
    return NextResponse.json(
      { error: "You can only assign doctors from your own region." },
      { status: 403 },
    );
  }

  await motherRef.update({
    assignedDoctorUid: payload.doctorUid,
    assignedDoctorAssignedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Users",
    actionType: "Assign",
    action: "Assigned doctor to mother",
    target:
      (mother?.fullName as string | undefined) ||
      (mother?.username as string | undefined) ||
      "Unknown Mother",
    regionId: actor.regionId ?? null,
    metadata: {
      motherUid: payload.motherUid,
      doctorUid: payload.doctorUid,
      doctorName:
        (doctor?.displayName as string | undefined) ||
        (doctor?.username as string | undefined) ||
        "Unknown Doctor",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return handleList(request);
}

export async function PATCH(request: NextRequest) {
  return handleAssignDoctor(request);
}
