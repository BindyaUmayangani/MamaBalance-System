import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

import { formatDate } from "@/lib/admin/format";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

type ObservationSource = "doctor" | "homeVisit" | "clinicVisit";
type MedicationStatus = "Active" | "Completed" | "Stopped";

function toDate(value: unknown) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: unknown) {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function calculateAge(value: unknown) {
  const birthdate = toDate(value);
  if (!birthdate) return "-";

  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDelta = today.getMonth() - birthdate.getMonth();
  const hasHadBirthday =
    monthDelta > 0 ||
    (monthDelta === 0 && today.getDate() >= birthdate.getDate());

  if (!hasHadBirthday) age -= 1;
  return age >= 0 ? String(age) : "-";
}

function resolveRiskLevel(mother: DocumentData | undefined) {
  const explicit = String(mother?.riskLevel || "").toLowerCase();
  if (explicit === "high" || explicit === "moderate" || explicit === "low") return explicit;

  const latestEpdsScore = Number(mother?.latestEpdsScore ?? 0);
  if (mother?.isHighRisk || latestEpdsScore >= 20) return "high";
  if (latestEpdsScore >= 10) return "moderate";
  return "low";
}

function resolveLatestEpdsDate(mother: DocumentData | undefined, user: DocumentData | undefined) {
  return (
    mother?.latestEpdsSubmittedAt ??
    mother?.latestEpdsAttemptedAt ??
    mother?.latestEpdsCreatedAt ??
    mother?.updatedAt ??
    user?.updatedAt ??
    mother?.createdAt ??
    user?.createdAt
  );
}

async function loadRegionMap() {
  const snapshot = await adminDb.collection("regions").get();
  const regions = snapshot.empty
    ? DEFAULT_REGIONS
    : snapshot.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name || doc.id),
      }));

  return new Map(regions.map((region) => [region.id, region.name]));
}

async function loadStaffName(uid: unknown) {
  const staffUid = String(uid || "");
  if (!staffUid) return "-";

  const snapshot = await adminDb.collection("users").doc(staffUid).get();
  if (!snapshot.exists) return "-";

  const user = snapshot.data();
  return String(user?.displayName || user?.username || staffUid);
}

async function loadStaffNameMap(uids: Set<string>) {
  if (uids.size === 0) {
    return new Map<string, string>();
  }

  const snapshots = await Promise.all(
    Array.from(uids).map((staffUid) => adminDb.collection("users").doc(staffUid).get()),
  );

  const staffMap = new Map<string, string>();
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) {
      return;
    }

    const staff = snapshot.data();
    staffMap.set(snapshot.id, String(staff?.displayName || staff?.username || snapshot.id));
  });

  return staffMap;
}

function assessmentDate(assessment: DocumentData) {
  return toDate(
    assessment.submittedAt ??
      assessment.createdAt ??
      assessment.attemptedAt ??
      assessment.updatedAt,
  );
}

type EpdsHistoryItem = {
  id: string;
  score: number;
  submittedAt: string | null;
  label: string;
};

const EPDS_HISTORY_START_DATE = new Date("2026-04-15T00:00:00+05:30");

function buildEpdsHistoryItem(id: string, assessment: DocumentData): EpdsHistoryItem {
  const submittedAt = assessmentDate(assessment);
  const score = Number(assessment.totalScore ?? assessment.score ?? assessment.epdsScore ?? 0);

  return {
    id,
    score: Number.isFinite(score) ? score : 0,
    submittedAt: submittedAt?.toISOString() ?? null,
    label: submittedAt
      ? submittedAt.toLocaleDateString("en-LK", { month: "short", day: "numeric" })
      : String(assessment.weekLabel || "EPDS"),
  };
}

function isCompleteEpdsAttempt(assessment: DocumentData) {
  const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
  const language = String(assessment.language || "").trim();
  return answers.length > 0 || language.length > 0;
}

function isVisibleEpdsHistoryItem(item: EpdsHistoryItem) {
  if (!item.submittedAt && item.score <= 0) {
    return false;
  }

  const submittedAt = item.submittedAt ? new Date(item.submittedAt) : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) {
    return false;
  }

  return submittedAt.getTime() >= EPDS_HISTORY_START_DATE.getTime();
}

async function loadEpdsHistory(uid: string, userUid: string, motherUserId: string) {
  const attemptSnapshot = await adminDb
    .collection("mothers")
    .doc(uid)
    .collection("epdsAttempts")
    .get();
  const epdsSnapshot = await adminDb.collection("epdsAssessments").get();

  const allAttemptDocs = attemptSnapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
  const completeAttemptDocs = allAttemptDocs.filter(({ data }) => isCompleteEpdsAttempt(data));
  const attemptDocs = completeAttemptDocs.length > 0 ? completeAttemptDocs : allAttemptDocs;
  const attemptHistory = attemptDocs
    .map((doc) => buildEpdsHistoryItem(doc.id, doc.data))
    .filter(isVisibleEpdsHistoryItem);
  const assessmentHistory = epdsSnapshot.docs
    .map((doc) => {
      const assessment = doc.data();

      if (!matchesMotherRecord(assessment, uid, userUid, motherUserId)) {
        return null;
      }

      return buildEpdsHistoryItem(doc.id, assessment);
    })
    .filter((item): item is EpdsHistoryItem => Boolean(item))
    .filter(isVisibleEpdsHistoryItem);

  return [...attemptHistory, ...assessmentHistory]
    .sort((left, right) => {
      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
      return leftTime - rightTime;
    });
}

function isoSortValue(value: unknown) {
  return toDate(value)?.toISOString() ?? "";
}

function formatCareDate(value: unknown) {
  return formatDate(toDate(value)) || "-";
}

function formatDosage(value: unknown) {
  return String(value || "").replace(/mg/gi, "").trim();
}

function normalizeMedicationStatus(value: unknown): MedicationStatus {
  const normalized = String(value || "Active").toLowerCase();

  if (normalized === "completed") return "Completed";
  if (normalized === "stopped") return "Stopped";
  return "Active";
}

function matchesMotherRecord(
  record: DocumentData,
  uid: string,
  userUid: string,
  motherUserId: string,
) {
  const motherId = String(record.motherId || "");
  const motherUid = String(record.motherUid || record.userUid || "");
  const recordUserId = String(record.userId || record.motherUserId || "");

  return (
    motherId === uid ||
    motherUid === uid ||
    motherUid === userUid ||
    recordUserId === motherUserId
  );
}

function normalizeObservationSource(data: DocumentData, fallback: ObservationSource): ObservationSource {
  const source = String(data.source || "").trim();

  if (source === "clinicVisit") return "clinicVisit";
  if (source === "homeVisit") return "homeVisit";
  if (source === "doctor") return "doctor";

  return fallback;
}

function formatObservedBy(
  data: DocumentData,
  source: ObservationSource,
  staffMap: Map<string, string>,
) {
  if (source === "doctor") {
    const doctorUid = String(data.doctorId || data.authorUid || "");
    const doctorName = staffMap.get(doctorUid) || String(data.observedBy || data.authorName || "Doctor");

    if (!doctorName || doctorName === "-") return "Doctor";
    return doctorName.startsWith("Dr. ") ? doctorName : `Dr. ${doctorName}`;
  }

  const midwifeUid = String(data.midwifeUid || data.authorUid || "");
  const midwifeName = staffMap.get(midwifeUid) || String(data.observedBy || data.authorName || "Midwife");

  if (!midwifeName || midwifeName === "-") return "Midwife";
  return midwifeName.startsWith("Midwife ") ? midwifeName : `Midwife ${midwifeName}`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { uid } = await context.params;
  const [userSnapshot, motherSnapshot, regionMap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("mothers").doc(uid).get(),
    loadRegionMap(),
  ]);

  if (!userSnapshot.exists && !motherSnapshot.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  const user = userSnapshot.data();
  const mother = motherSnapshot.data();
  const regionId = String(user?.regionId || mother?.regionId || "");

  if (actor.role === "regionaladmin" && actor.regionId && regionId !== actor.regionId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const userUid = String(mother?.userUid || user?.uid || uid);
  const motherUserId = String(user?.userId || mother?.userId || "");
  const [epdsHistory, careObservationSnapshot, midwifeObservationSnapshot, medicationSnapshot] =
    await Promise.all([
      loadEpdsHistory(uid, userUid, motherUserId),
      adminDb.collection("careObservations").get(),
      adminDb.collection("midwifeObservations").get(),
      adminDb.collection("careMedications").get(),
    ]);

  const observationDocs = [
    ...careObservationSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
      fallbackSource: "doctor" as ObservationSource,
    })),
    ...midwifeObservationSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
      fallbackSource: "homeVisit" as ObservationSource,
    })),
  ].filter((entry) => matchesMotherRecord(entry.data, uid, userUid, motherUserId));
  const medicationDocs = medicationSnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((entry) => matchesMotherRecord(entry.data, uid, userUid, motherUserId));
  const authorUids = new Set<string>();

  observationDocs.forEach(({ data }) => {
    const doctorUid = String(data.doctorId || "");
    const midwifeUid = String(data.midwifeUid || "");
    const authorUid = String(data.authorUid || "");

    if (doctorUid) authorUids.add(doctorUid);
    if (midwifeUid) authorUids.add(midwifeUid);
    if (authorUid) authorUids.add(authorUid);
  });

  medicationDocs.forEach(({ data }) => {
    const prescribedByUid = String(data.prescribedByUid || "");
    if (prescribedByUid) authorUids.add(prescribedByUid);
  });

  const staffMap = await loadStaffNameMap(authorUids);
  const observations = observationDocs
    .map(({ id, data, fallbackSource }) => {
      const source = normalizeObservationSource(data, fallbackSource);
      const observedAt = data.observedAt ?? data.createdAt ?? data.updatedAt;

      return {
        id,
        source,
        timestamp: formatDateTime(observedAt),
        observedAt: isoSortValue(observedAt),
        title: String(data.title || "Observation"),
        detailedNote: String(data.note || data.detailedNote || data.additional || "-"),
        mood: String(data.mood || "Normal"),
        sleep: String(data.sleep || "Moderate"),
        appetite: String(data.appetite || "Good"),
        nextObservationDate: formatDateTime(data.nextObservationAt ?? data.upcomingCheckup),
        observedBy: formatObservedBy(data, source, staffMap),
      };
    })
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  const medications = medicationDocs
    .map(({ id, data }) => {
      const prescribedByUid = String(data.prescribedByUid || "");
      const prescribedBy =
        staffMap.get(prescribedByUid) || String(data.prescribedBy || "Unknown Doctor");
      const status = normalizeMedicationStatus(data.status);

      return {
        id,
        name: String(data.medicationName || data.name || ""),
        dosage: formatDosage(data.dosage),
        frequency: String(data.frequency || ""),
        startDate: formatCareDate(data.startDate || data.createdAt),
        endDate: data.endDate ? formatCareDate(data.endDate) : "",
        prescribedBy,
        status,
        notes: String(data.notes || ""),
        instructions: String(data.instructions || ""),
        reasonStopped: data.reasonStopped ? String(data.reasonStopped) : undefined,
        updatedAt: isoSortValue(data.updatedAt || data.createdAt || data.startDate),
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const activeMedications = medications.filter((entry) => entry.status === "Active");
  const medicationHistory = medications.filter((entry) => entry.status !== "Active");

  const latestEpdsScore = Number(mother?.latestEpdsScore ?? epdsHistory.at(-1)?.score ?? 0);
  const latestEpdsDate = resolveLatestEpdsDate(mother, user);

  return NextResponse.json({
    uid,
    userId: String(user?.userId || mother?.userId || uid),
    name: String(user?.displayName || mother?.fullName || "Unknown Mother"),
    username: String(user?.username || mother?.username || "-"),
    email: String(user?.email || mother?.email || "-"),
    personalEmail: String(user?.personalEmail || mother?.personalEmail || "-"),
    nic: String(mother?.nic || user?.nic || "-"),
    region: normalizeRegionName(regionMap.get(regionId) || user?.regionName || mother?.regionName || "-"),
    contact: String(user?.phoneNumber || mother?.phoneNumber || "-"),
    createdOn: formatDate(toDate(user?.createdAt ?? mother?.createdAt)),
    status: user?.status === "active" ? "active" : "inactive",
    role: "mother",
    riskStatus: resolveRiskLevel(mother),
    assignedMidwife: await loadStaffName(mother?.assignedMidwifeUid),
    assignedDoctor: await loadStaffName(mother?.assignedDoctorUid),
    lastEpdScore: Number.isFinite(latestEpdsScore) ? latestEpdsScore : 0,
    lastEpdTestDate: latestEpdsScore > 0 ? formatDateTime(latestEpdsDate) : "-",
    age: calculateAge(mother?.birthdate ?? mother?.dob),
    birthdate: formatDate(toDate(mother?.birthdate ?? mother?.dob)),
    address: String(mother?.address || "-"),
    guardianName: String(mother?.guardianName || "-"),
    guardianContact: String(mother?.guardianContact || "-"),
    deliveryDate: formatDate(toDate(mother?.deliveryDate ?? mother?.expectedDeliveryDate)),
    noOfChildren: Number(mother?.noOfChildren ?? 0),
    epdsHistory,
    observations,
    medications,
    activeMedications,
    medicationHistory,
  });
}
