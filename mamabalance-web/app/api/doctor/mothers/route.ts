import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { formatDate } from "@/lib/admin/format";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { adminDb } from "@/lib/firebase/admin";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";
import type { MidwifeMotherRecord } from "@/lib/midwife/types";

type DoctorVisitStatus = "Overdue" | "Upcoming" | "Rescheduled" | "Completed";

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

function resolveVisitStatus(rawStatus: unknown, scheduledAt: string): DoctorVisitStatus {
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
  status: DoctorVisitStatus,
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
      status: DoctorVisitStatus;
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
      sorted.find((visit) => visit.status === "Overdue") ||
      sorted[sorted.length - 1];

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

function buildMotherRecord(
  uid: string,
  user: DocumentData | undefined,
  mother: DocumentData,
  regionMap: Map<string, string>,
  doctorNames: string[],
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
    lastEPDS: latestEpdsScore > 0 ? String(latestEpdsScore) : "-",
    lastEPDSTestDate:
      latestEpdsScore > 0
        ? formatDateTime(resolveLatestEpdsAttemptDate(mother, user))
        : "-",
    assignedDoctor: doctorNames[0] || null,
    assignedDoctorUid: String(mother.assignedDoctorUid || "") || null,
    assignedAt: formatDateTime(mother.assignedDoctorAssignedAt ?? mother.updatedAt),
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

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);

  const [regionMap, motherSnapshots, doctorSnapshots, visitSnapshot] = await Promise.all([
    loadRegionMap(),
    Promise.all(
      linkedDoctorUids.map((uid) =>
        adminDb.collection("mothers").where("assignedDoctorUid", "==", uid).get(),
      ),
    ),
    Promise.all(
      linkedDoctorUids.map((uid) =>
        adminDb.collection("users").doc(uid).get(),
      ),
    ),
    adminDb.collection("doctorCheckups").get(),
  ]);

  const doctorNames = doctorSnapshots
    .filter((doc) => doc.exists)
    .map((doc) => {
      const data = doc.data();

      return (
        (data?.displayName as string | undefined) ||
        (data?.username as string | undefined) ||
        "Assigned Doctor"
      );
    });

  const motherDocs = motherSnapshots.flatMap((snapshot) => snapshot.docs);
  const motherMap = new Map(motherDocs.map((doc) => [doc.id, doc]));

  const userSnapshots = await Promise.all(
    [...motherMap.keys()].map((uid) => adminDb.collection("users").doc(uid).get()),
  );

  const userMap = new Map(
    userSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );

  const visitLookup = buildVisitLookup(
    visitSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    })),
  );

  const mothers = [...motherMap.values()]
    .map((doc) =>
      buildMotherRecord(
        doc.id,
        userMap.get(doc.id),
        doc.data(),
        regionMap,
        doctorNames,
        visitLookup,
      ),
    )
    .filter((mother) => mother.risk === "high")
    .sort((left, right) => left.name.localeCompare(right.name));

  return NextResponse.json({ mothers });
}
