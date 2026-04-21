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
  getMedicineSuggestionStatusLabel,
  isMedicineForm,
  isMedicineSuggestionStatus,
  type MedicineForm,
  type MedicineRecord,
  type MedicineSuggestionRecord,
} from "@/lib/medicine/types";

const SUGGESTION_COLLECTION = "medicineSuggestions";
const MEDICINE_COLLECTION = "medicines";

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

function buildSuggestionRecord(
  id: string,
  data: DocumentData,
  userNameMap: Map<string, string>,
): MedicineSuggestionRecord {
  const form = isMedicineForm(data.form) ? data.form : "other";
  const status = isMedicineSuggestionStatus(data.status)
    ? data.status
    : "pending";
  const brandName = String(data.brandName || "-");
  const genericName = String(data.genericName || "-");
  const strength = String(data.strength || "-");
  const displayName = buildMedicineDisplayName({
    brandName,
    genericName,
    strength,
  });

  return {
    id,
    suggestionId: String(data.suggestionId || buildUserCode("MSG", id)),
    brandName,
    genericName,
    strength,
    form,
    formLabel: getMedicineFormLabel(form),
    defaultNotes: String(data.defaultNotes || ""),
    status,
    statusLabel: getMedicineSuggestionStatusLabel(status),
    displayName,
    searchText:
      String(data.searchText || "") ||
      buildMedicineSearchText({ brandName, genericName, strength, form }),
    suggestedByName:
      userNameMap.get(String(data.suggestedByUid || "")) ||
      String(data.suggestedByName || "-"),
    suggestedByRole: String(data.suggestedByRole || "-"),
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt || data.createdAt),
    linkedMedicineId: data.linkedMedicineId ? String(data.linkedMedicineId) : null,
  };
}

function buildMedicineRecord(
  id: string,
  data: DocumentData,
  userNameMap: Map<string, string>,
): MedicineRecord {
  const form = isMedicineForm(data.form) ? data.form : "other";
  const brandName = String(data.brandName || "-");
  const genericName = String(data.genericName || "-");
  const strength = String(data.strength || "-");

  return {
    id,
    medicineId: String(data.medicineId || buildUserCode("MED", id)),
    brandName,
    genericName,
    strength,
    form,
    formLabel: getMedicineFormLabel(form),
    defaultNotes: String(data.defaultNotes || ""),
    status: "active",
    statusLabel: "Active",
    displayName: buildMedicineDisplayName({ brandName, genericName, strength }),
    searchText:
      String(data.searchText || "") ||
      buildMedicineSearchText({ brandName, genericName, strength, form }),
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt || data.createdAt),
    createdByName:
      userNameMap.get(String(data.createdByUid || "")) || "-",
    updatedByName:
      userNameMap.get(String(data.updatedByUid || data.createdByUid || "")) ||
      "-",
  };
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb.collection(SUGGESTION_COLLECTION).get();
  const userNameMap = await loadUserNameMap(
    snapshot.docs.map((doc) => String(doc.data().suggestedByUid || "")),
  );

  const suggestions = snapshot.docs
    .map((doc) => buildSuggestionRecord(doc.id, doc.data(), userNameMap))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return NextResponse.json({ suggestions });
}

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    action?: "approve" | "reject";
    medicine?: {
      brandName?: string;
      genericName?: string;
      strength?: string;
      form?: MedicineForm;
      defaultNotes?: string;
    };
  };

  if (!payload.id?.trim()) {
    return NextResponse.json({ error: "Suggestion ID is required." }, { status: 400 });
  }

  if (payload.action !== "approve" && payload.action !== "reject") {
    return NextResponse.json({ error: "Unsupported suggestion action." }, { status: 400 });
  }

  const suggestionRef = adminDb.collection(SUGGESTION_COLLECTION).doc(payload.id.trim());
  const suggestionSnapshot = await suggestionRef.get();

  if (!suggestionSnapshot.exists) {
    return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  }

  const suggestion = suggestionSnapshot.data() || {};

  if (payload.action === "reject") {
    await suggestionRef.update({
      status: "rejected",
      reviewedByUid: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAuditEvent({
      actor,
      module: "Medicine",
      actionType: "Update",
      action: "Rejected pending medicine suggestion",
      target: String(suggestion.brandName || suggestion.genericName || payload.id),
    });

    return NextResponse.json({ ok: true });
  }

  const brandName = String(
    payload.medicine?.brandName || suggestion.brandName || "",
  ).trim();
  const genericName = String(
    payload.medicine?.genericName || suggestion.genericName || "",
  ).trim();
  const strength = String(
    payload.medicine?.strength || suggestion.strength || "",
  ).trim();
  const form = isMedicineForm(payload.medicine?.form)
    ? payload.medicine!.form
    : isMedicineForm(suggestion.form)
      ? suggestion.form
      : "other";

  if (!brandName || !genericName || !strength) {
    return NextResponse.json(
      { error: "Brand name, generic name, and strength are required to approve." },
      { status: 400 },
    );
  }

  const medicineRef = adminDb.collection(MEDICINE_COLLECTION).doc();
  const createdAt = FieldValue.serverTimestamp();

  await medicineRef.set({
    medicineId: buildUserCode("MED", medicineRef.id),
    brandName,
    genericName,
    strength,
    form,
    defaultNotes: String(
      payload.medicine?.defaultNotes || suggestion.defaultNotes || "",
    ).trim(),
    status: "active",
    searchText: buildMedicineSearchText({
      brandName,
      genericName,
      strength,
      form,
    }),
    createdAt,
    updatedAt: createdAt,
    createdByUid: actor.uid,
    updatedByUid: actor.uid,
  });

  await suggestionRef.update({
    status: "approved",
    linkedMedicineId: medicineRef.id,
    reviewedByUid: actor.uid,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Medicine",
    actionType: "Create",
    action: "Approved medicine suggestion into catalog",
    target: brandName,
  });

  const storedMedicineSnapshot = await medicineRef.get();
  const userNameMap = new Map([[actor.uid, actor.displayName || actor.uid]]);

  return NextResponse.json({
    ok: true,
    medicine: buildMedicineRecord(
      medicineRef.id,
      storedMedicineSnapshot.data() || {},
      userNameMap,
    ),
  });
}

