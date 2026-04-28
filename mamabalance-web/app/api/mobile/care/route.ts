import { NextRequest, NextResponse } from "next/server";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

type MobileRole = "mother" | "guardian";

type MobileContext = {
  role: MobileRole;
  userDocId: string;
  motherDocId: string;
  mother: DocumentData;
};

function readString(value: unknown) {
  return String(value || "").trim();
}

function toIso(value: unknown) {
  const timestamp = value as { toDate?: () => Date };
  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : value instanceof Date
        ? value
        : value
          ? new Date(String(value))
          : null;

  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function dateOnly(value: unknown) {
  const iso = toIso(value);
  return iso ? iso.split("T")[0] : "-";
}

function normalizeFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeFirestoreValue(item),
      ]),
    );
  }
  return value;
}

async function verifyMobileRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  return adminAuth.verifyIdToken(token);
}

async function findUserDoc(decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>) {
  const direct = await adminDb.collection("users").doc(decoded.uid).get();
  if (direct.exists) return direct;

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb
      .collection("users")
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();
    if (!byPhone.empty) return byPhone.docs[0];
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byEmail = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!byEmail.empty) return byEmail.docs[0];

    const byPersonalEmail = await adminDb
      .collection("users")
      .where("personalEmail", "==", email)
      .limit(1)
      .get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }

  return null;
}

async function findMotherForMother(
  userDocId: string,
  decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>,
) {
  const direct = await adminDb.collection("mothers").doc(userDocId).get();
  if (direct.exists) return direct;

  const byUserUid = await adminDb
    .collection("mothers")
    .where("userUid", "==", userDocId)
    .limit(1)
    .get();
  if (!byUserUid.empty) return byUserUid.docs[0];

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb
      .collection("mothers")
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();
    if (!byPhone.empty) return byPhone.docs[0];
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byPersonalEmail = await adminDb
      .collection("mothers")
      .where("personalEmail", "==", email)
      .limit(1)
      .get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }

  return null;
}

async function findMotherForGuardian(
  userDocId: string,
  decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>,
) {
  const byGuardianUid = await adminDb
    .collection("mothers")
    .where("guardianUid", "==", userDocId)
    .limit(1)
    .get();
  if (!byGuardianUid.empty) return byGuardianUid.docs[0];

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byGuardianContact = await adminDb
      .collection("mothers")
      .where("guardianContact", "==", phone)
      .limit(1)
      .get();
    if (!byGuardianContact.empty) return byGuardianContact.docs[0];
  }

  const link = await adminDb
    .collection("guardianLinks")
    .where("guardianUid", "==", userDocId)
    .where("isActive", "==", true)
    .limit(1)
    .get();
  const motherId = readString(link.docs[0]?.data().motherId);
  if (motherId) {
    const motherDoc = await adminDb.collection("mothers").doc(motherId).get();
    if (motherDoc.exists) return motherDoc;
  }

  return null;
}

async function resolveMobileContext(request: NextRequest): Promise<MobileContext | NextResponse> {
  const decoded = await verifyMobileRequest(request);
  const userDoc = await findUserDoc(decoded);

  if (!userDoc?.exists) {
    return NextResponse.json(
      { error: "This account has not been registered in MamaBalance yet." },
      { status: 404 },
    );
  }

  const user = userDoc.data() || {};
  const role = readString(user.role).toLowerCase() as MobileRole;
  const status = readString(user.status).toLowerCase();

  if (!["mother", "guardian"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized mobile account." }, { status: 403 });
  }

  if (status !== "active") {
    return NextResponse.json({ error: "Your account is not active yet." }, { status: 403 });
  }

  const motherDoc =
    role === "guardian"
      ? await findMotherForGuardian(userDoc.id, decoded)
      : await findMotherForMother(userDoc.id, decoded);

  if (!motherDoc?.exists) {
    return NextResponse.json(
      { error: "Unable to find your linked mother profile." },
      { status: 404 },
    );
  }

  return {
    role,
    userDocId: userDoc.id,
    motherDocId: motherDoc.id,
    mother: motherDoc.data() || {},
  };
}

function pickNextUpcoming(items: DocumentData[]) {
  const now = Date.now();
  let bestItem: DocumentData | null = null;
  let bestDate = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const status = readString(item.status).toLowerCase();
    if (status === "completed" || status === "cancelled") continue;

    const scheduledAt = toIso(item.scheduledAt);
    const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN;
    if (!Number.isFinite(scheduledMs) || scheduledMs < now) continue;

    if (scheduledMs < bestDate) {
      bestDate = scheduledMs;
      bestItem = item;
    }
  }

  return bestItem ? normalizeFirestoreValue(bestItem) : null;
}

async function loadVisits(motherUid: string) {
  const [midwifeVisitsSnapshot, doctorCheckupsSnapshot] = await Promise.all([
    adminDb.collection("midwifeVisits").where("motherUid", "==", motherUid).get(),
    adminDb.collection("doctorCheckups").where("motherUid", "==", motherUid).get(),
  ]);

  const midwifeVisits = midwifeVisitsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const doctorCheckups = doctorCheckupsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    homeVisit: pickNextUpcoming(
      midwifeVisits.filter((item) => readString(item.visitType).toLowerCase() === "home"),
    ),
    clinicVisit: pickNextUpcoming(
      midwifeVisits.filter((item) => readString(item.visitType).toLowerCase() === "clinic"),
    ),
    doctorCheckup: pickNextUpcoming(doctorCheckups),
  };
}

function medicationFromDoc(id: string, data: DocumentData) {
  const rawStatus = readString(data.status || "Active").toLowerCase();
  const status =
    rawStatus === "completed" ? "Completed" : rawStatus === "stopped" ? "Stopped" : "Active";
  const dosage = readString(data.dosage).replace(/mg/gi, "").trim() || "-";
  const updatedAt = toIso(data.updatedAt || data.createdAt || data.startDate) || new Date(0).toISOString();

  return {
    id,
    name: readString(data.medicationName || data.name) || "Medication",
    dosage,
    frequency: readString(data.frequency) || "-",
    startDate: dateOnly(data.startDate || data.createdAt),
    endDate: dateOnly(data.endDate),
    prescribedBy: readString(data.prescribedBy) || "Doctor",
    status,
    notes: readString(data.notes),
    instructions: readString(data.instructions),
    reasonStopped: readString(data.reasonStopped),
    updatedAt,
  };
}

async function loadPrescriptions(motherUid: string) {
  const [careMedicationSnapshot, medicationSnapshot] = await Promise.all([
    adminDb.collection("careMedications").where("motherUid", "==", motherUid).get(),
    adminDb.collection("medications").where("motherUid", "==", motherUid).get(),
  ]);

  const medications = [...careMedicationSnapshot.docs, ...medicationSnapshot.docs]
    .map((doc) => medicationFromDoc(doc.id, doc.data()))
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());

  return {
    activeMedications: medications.filter((item) => item.status.toLowerCase() === "active"),
    medicationHistory: medications.filter((item) => item.status.toLowerCase() !== "active"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    const url = new URL(request.url);
    const type = readString(url.searchParams.get("type")).toLowerCase();

    if (type === "visits") {
      return NextResponse.json({
        ok: true,
        visits: await loadVisits(context.motherDocId),
      });
    }

    if (type === "prescriptions") {
      return NextResponse.json({
        ok: true,
        prescriptions: await loadPrescriptions(context.motherDocId),
      });
    }

    const [visits, prescriptions] = await Promise.all([
      loadVisits(context.motherDocId),
      loadPrescriptions(context.motherDocId),
    ]);

    return NextResponse.json({ ok: true, visits, prescriptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load care details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
