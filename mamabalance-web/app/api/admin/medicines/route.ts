import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";

import { buildUserCode, formatDate } from "@/lib/admin/format";
import { logAuditEvent } from "@/lib/audit/log";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildMedicineDisplayName,
  buildMedicineSearchText,
  getMedicineFormLabel,
  getMedicineStatusLabel,
  isMedicineCategory,
  isMedicineForm,
  isMedicineStatus,
  type MedicinePayload,
  type MedicineRecord,
} from "@/lib/medicine/types";

const COLLECTION_NAME = "medicines";

function formatTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return formatDate(value.toDate());
  }

  if (value instanceof Date || typeof value === "string") {
    return formatDate(value);
  }

  return "-";
}

async function loadUserNameMap(userUids: string[]) {
  if (userUids.length === 0) {
    return new Map<string, string>();
  }

  const unique = Array.from(new Set(userUids.filter(Boolean)));
  const snapshots = await Promise.all(
    unique.map((uid) => adminDb.collection("users").doc(uid).get()),
  );

  return new Map(
    snapshots
      .filter((doc) => doc.exists)
      .map((doc) => [
        doc.id,
        String(doc.data()?.displayName || doc.data()?.username || doc.id),
      ]),
  );
}

function buildMedicineRecord(
  id: string,
  data: DocumentData,
  userNameMap: Map<string, string>,
): MedicineRecord {
  const form = isMedicineForm(data.form) ? data.form : "other";
  const status = isMedicineStatus(data.status) ? data.status : "active";
  const brandName = String(data.brandName || "-");
  const genericName = String(data.genericName || "-");
  const strength = String(data.strength || "-");
  const category = isMedicineCategory(data.category)
    ? data.category
    : "Other";
  const defaultNotes = String(data.defaultNotes || "");
  const displayName = buildMedicineDisplayName({
    brandName,
    genericName,
    strength,
  });

  return {
    id,
    medicineId: String(data.medicineId || buildUserCode("MED", id)),
    brandName,
    genericName,
    strength,
    form,
    formLabel: getMedicineFormLabel(form),
    category,
    defaultNotes,
    status,
    statusLabel: getMedicineStatusLabel(status),
    displayName,
    searchText:
      String(data.searchText || "") ||
      buildMedicineSearchText({
        brandName,
        genericName,
        form,
        category,
      }),
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt || data.createdAt),
    createdByName:
      userNameMap.get(String(data.createdByUid || "")) || "-",
    updatedByName:
      userNameMap.get(String(data.updatedByUid || data.createdByUid || "")) ||
      "-",
  };
}

function validatePayload(payload: Partial<MedicinePayload>) {
  if (!payload.brandName?.trim()) {
    return "Brand name is required.";
  }

  if (!payload.genericName?.trim()) {
    return "Generic name is required.";
  }

  if (!isMedicineForm(payload.form)) {
    return "Invalid medicine form.";
  }

  if (!isMedicineCategory(payload.category)) {
    return "Invalid medicine category.";
  }

  if (!isMedicineStatus(payload.status)) {
    return "Invalid medicine status.";
  }

  return null;
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb.collection(COLLECTION_NAME).get();
  const userNameMap = await loadUserNameMap(
    snapshot.docs.flatMap((doc) => [
      String(doc.data().createdByUid || ""),
      String(doc.data().updatedByUid || ""),
    ]),
  );

  const medicines = snapshot.docs
    .map((doc) => buildMedicineRecord(doc.id, doc.data(), userNameMap))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return NextResponse.json({ medicines });
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as MedicinePayload;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc();
  const createdAt = FieldValue.serverTimestamp();
  const brandName = payload.brandName.trim();
  const genericName = payload.genericName.trim();
  const category = payload.category.trim();

  await docRef.set({
    medicineId: buildUserCode("MED", docRef.id),
    brandName,
    genericName,
    strength: "",
    form: payload.form,
    category,
    defaultNotes: payload.defaultNotes?.trim() || "",
    status: payload.status,
    searchText: buildMedicineSearchText({
      brandName,
      genericName,
      form: payload.form,
      category,
    }),
    createdAt,
    updatedAt: createdAt,
    createdByUid: actor.uid,
    updatedByUid: actor.uid,
  });

  await logAuditEvent({
    actor,
    module: "Medicine",
    actionType: "Create",
    action: "Added medicine to catalog",
    target: brandName,
  });

  const storedSnapshot = await docRef.get();
  const userNameMap = new Map([[actor.uid, actor.displayName || actor.uid]]);

  return NextResponse.json({
    ok: true,
    medicine: buildMedicineRecord(docRef.id, storedSnapshot.data() || {}, userNameMap),
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as MedicinePayload & { id?: string };

  if (!payload.id?.trim()) {
    return NextResponse.json({ error: "Medicine ID is required." }, { status: 400 });
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc(payload.id.trim());
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Medicine not found." }, { status: 404 });
  }

  const brandName = payload.brandName.trim();
  const genericName = payload.genericName.trim();
  const category = payload.category.trim();

  await docRef.update({
    brandName,
    genericName,
    strength: "",
    form: payload.form,
    category,
    defaultNotes: payload.defaultNotes?.trim() || "",
    status: payload.status,
    searchText: buildMedicineSearchText({
      brandName,
      genericName,
      form: payload.form,
      category,
    }),
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: actor.uid,
  });

  await logAuditEvent({
    actor,
    module: "Medicine",
    actionType: "Update",
    action:
      payload.status === "inactive"
        ? "Updated medicine and set inactive"
        : "Updated medicine in catalog",
    target: brandName,
  });

  const storedSnapshot = await docRef.get();
  const previous = snapshot.data() || {};
  const userNameMap = new Map([
    [actor.uid, actor.displayName || actor.uid],
    [
      String(previous.createdByUid || ""),
      String(previous.createdByUid || ""),
    ],
  ]);

  return NextResponse.json({
    ok: true,
    medicine: buildMedicineRecord(docRef.id, storedSnapshot.data() || {}, userNameMap),
  });
}

export async function DELETE(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { id?: string };

  if (!payload.id?.trim()) {
    return NextResponse.json(
      { error: "Medicine ID is required." },
      { status: 400 },
    );
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc(payload.id.trim());
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Medicine not found." }, { status: 404 });
  }

  const medicine = snapshot.data() || {};
  await docRef.delete();

  await logAuditEvent({
    actor,
    module: "Medicine",
    actionType: "Delete",
    action: "Deleted medicine from catalog",
    target: String(medicine.brandName || medicine.genericName || payload.id),
  });

  return NextResponse.json({ ok: true });
}
