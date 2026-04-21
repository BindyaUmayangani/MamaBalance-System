import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { buildUserCode } from "@/lib/admin/format";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";
import {
  buildMedicineDisplayName,
  buildMedicineSearchText,
  isMedicineForm,
} from "@/lib/medicine/types";

type MedicationStatus = "Active" | "Completed" | "Stopped";

type MedicationRecord = {
  id: string;
  motherUid: string;
  motherId: string;
  motherName: string;
  motherUsername: string;
  medicineId?: string | null;
  medicineSource?: "catalog" | "custom";
  customMedicineName?: string;
  genericName?: string;
  strength?: string;
  form?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  updatedAt: string;
  status: MedicationStatus;
  notes: string;
  instructions: string;
  reasonStopped?: string;
};

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

type DoctorMedicineInput = {
  medicineId?: string;
  medicationName?: string;
  medicineMode?: "catalog" | "custom";
  customMedicineName?: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  form?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  instructions?: string;
  suggestToCatalog?: boolean;
};

function buildSuggestionKey(input: {
  brandName?: string;
  genericName?: string;
  strength?: string;
  form?: string;
}) {
  return [
    input.brandName,
    input.genericName,
    input.strength,
    input.form,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
}

async function upsertPendingSuggestion(args: {
  actorUid: string;
  actorName: string;
  input: DoctorMedicineInput;
}) {
  const brandName = String(
    args.input.brandName || args.input.customMedicineName || args.input.medicationName || "",
  ).trim();
  const genericName = String(args.input.genericName || brandName).trim();
  const strength = String(args.input.strength || "").trim();
  const form = isMedicineForm(args.input.form) ? args.input.form : "other";

  if (!brandName || !genericName || !strength) {
    return null;
  }

  const suggestionKey = buildSuggestionKey({
    brandName,
    genericName,
    strength,
    form,
  });

  const existingSnapshot = await adminDb
    .collection("medicineSuggestions")
    .where("suggestionKey", "==", suggestionKey)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    await existingDoc.ref.update({
      updatedAt: FieldValue.serverTimestamp(),
      lastSuggestedAt: FieldValue.serverTimestamp(),
      suggestedByUid: args.actorUid,
      suggestedByName: args.actorName,
      suggestedByRole: "doctor",
    });
    return existingDoc.id;
  }

  const suggestionRef = adminDb.collection("medicineSuggestions").doc();
  await suggestionRef.set({
    suggestionId: buildUserCode("MSG", suggestionRef.id),
    brandName,
    genericName,
    strength,
    form,
    defaultNotes: String(args.input.notes || "").trim(),
    searchText: buildMedicineSearchText({
      brandName,
      genericName,
      strength,
      form,
    }),
    suggestionKey,
    status: "pending",
    suggestedByUid: args.actorUid,
    suggestedByName: args.actorName,
    suggestedByRole: "doctor",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastSuggestedAt: FieldValue.serverTimestamp(),
  });

  return suggestionRef.id;
}

function formatDate(dateValue: unknown) {
  if (!dateValue) return "";
  const dateObj =
    dateValue instanceof Date
      ? dateValue
      : typeof dateValue === "object" &&
          dateValue !== null &&
          "toDate" in dateValue &&
          typeof (dateValue as { toDate?: unknown }).toDate === "function"
        ? (dateValue as { toDate: () => Date }).toDate()
        : new Date(String(dateValue));
  if (Number.isNaN(dateObj.getTime())) return "";
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
    return NextResponse.json({ medications: [], mothers: [] });
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
          riskLevel: String(data.riskLevel || "Low").charAt(0).toUpperCase() + String(data.riskLevel || "low").slice(1),
        },
      ];
    }),
  );

  const uids = assignedMotherDocs.map(doc => doc.id);

  const medicationBatches = await Promise.all(
    chunk(uids, 10).map((chunkUids) =>
      adminDb.collection("careMedications").where("motherUid", "in", chunkUids).get()
    )
  );

  const doctorUids = new Set<string>();
  medicationBatches.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      if (doc.data().prescribedByUid) {
        doctorUids.add(doc.data().prescribedByUid);
      }
    });
  });

  const doctorMap = new Map<string, string>();
  if (doctorUids.size > 0) {
    const doctorDocs = await Promise.all(
      Array.from(doctorUids).map(uid => adminDb.collection("users").doc(uid).get())
    );
    doctorDocs.forEach(doc => {
      if (doc.exists) {
        doctorMap.set(doc.id, String(doc.data()?.displayName || "Unknown Doctor"));
      }
    });
  }

  const medications: MedicationRecord[] = [];

  medicationBatches.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const mother = motherMap.get(String(data.motherUid || ""));
      const doctorName = doctorMap.get(String(data.prescribedByUid || "")) || String(data.prescribedBy || "Unknown Doctor");

      medications.push({
        id: doc.id,
        motherUid: String(data.motherUid || ""),
        motherId: String(data.motherUid || ""),
        motherName: mother?.name || "Unknown Mother",
        motherUsername: mother?.username || "-",
        medicineId: data.medicineId ? String(data.medicineId) : null,
        medicineSource:
          data.medicineSource === "custom" ? "custom" : "catalog",
        customMedicineName: data.customMedicineName
          ? String(data.customMedicineName)
          : "",
        genericName: data.genericName ? String(data.genericName) : "",
        strength: data.strength ? String(data.strength) : "",
        form: data.form ? String(data.form) : "",
        medicationName: String(data.medicationName || ""),
        dosage: String(data.dosage || "").trim(),
        frequency: String(data.frequency || ""),
        duration: String(data.duration || ""),
        startDate: formatDate(data.startDate || data.createdAt),
        endDate: formatDate(data.endDate),
        prescribedBy: doctorName,
        updatedAt: formatDate(data.updatedAt || data.createdAt),
        status: (data.status as MedicationStatus) || "Active",
        notes: String(data.notes || ""),
        instructions: String(data.instructions || ""),
        reasonStopped: data.reasonStopped ? String(data.reasonStopped) : undefined,
      });
    });
  });

  medications.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const mothersList = Array.from(motherMap.entries()).map(([id, mother]) => ({
    id,
    ...mother,
  }));

  return NextResponse.json({ medications, mothers: mothersList });
}

async function handleAdd(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();
  const { motherUid, prescribedBy, prescribedByUid, medicines } = payload;

  if (!motherUid || !medicines || !Array.isArray(medicines)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const linkedDoctorUids = await resolveLinkedDoctorUids(actor);
  const motherDoc = await adminDb.collection("mothers").doc(motherUid).get();

  if (!motherDoc.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  if (!linkedDoctorUids.includes(String(motherDoc.data()?.assignedDoctorUid || ""))) {
    return NextResponse.json({ error: "You can only prescribe to assigned mothers." }, { status: 403 });
  }

  const batch = adminDb.batch();
  let suggestedCount = 0;
  
  for (const med of medicines) {
    const medicineInput = med as DoctorMedicineInput;
    const medicineMode =
      medicineInput.medicineMode === "custom" ? "custom" : "catalog";

    let selectedMedicineDoc: DocumentData | null = null;
    let selectedMedicineRefId: string | null = null;

    if (medicineInput.medicineId?.trim()) {
      const medicineDoc = await adminDb
        .collection("medicines")
        .doc(medicineInput.medicineId.trim())
        .get();

      if (medicineDoc.exists && medicineDoc.data()?.status === "active") {
        selectedMedicineDoc = medicineDoc.data() || null;
        selectedMedicineRefId = medicineDoc.id;
      }
    }

    const customMedicineName = String(
      medicineInput.customMedicineName ||
        medicineInput.medicationName ||
        "",
    ).trim();
    const catalogBrandName = String(selectedMedicineDoc?.brandName || "").trim();
    const catalogGenericName = String(selectedMedicineDoc?.genericName || "").trim();
    const catalogStrength = String(selectedMedicineDoc?.strength || "").trim();
    const catalogForm = String(selectedMedicineDoc?.form || "").trim();

    const brandName =
      medicineMode === "custom"
        ? String(medicineInput.brandName || customMedicineName).trim()
        : catalogBrandName;
    const genericName =
      medicineMode === "custom"
        ? String(medicineInput.genericName || brandName).trim()
        : catalogGenericName;
    const strength =
      medicineMode === "custom"
        ? String(medicineInput.strength || "").trim()
        : catalogStrength;
    const form =
      medicineMode === "custom"
        ? (isMedicineForm(medicineInput.form) ? medicineInput.form : "other")
        : (catalogForm || "other");
    const medicationName =
      medicineMode === "custom"
        ? customMedicineName
        : buildMedicineDisplayName({
            brandName: catalogBrandName,
            genericName: catalogGenericName,
            strength: catalogStrength,
          });

    if (!medicationName) continue;

    let suggestionId: string | null = null;
    if (medicineMode === "custom" && medicineInput.suggestToCatalog) {
      suggestionId = await upsertPendingSuggestion({
        actorUid: actor.uid,
        actorName: actor.displayName || "Doctor",
        input: {
          ...medicineInput,
          brandName,
          genericName,
          strength,
          form,
          medicationName,
        },
      });
      if (suggestionId) {
        suggestedCount += 1;
      }
    }

    const docRef = adminDb.collection("careMedications").doc();
    batch.set(docRef, {
      motherUid,
      medicineId: selectedMedicineRefId,
      medicineSource: medicineMode,
      medicationName,
      customMedicineName: medicineMode === "custom" ? customMedicineName : "",
      brandName,
      genericName,
      strength,
      form,
      dosage: medicineInput.dosage?.trim() || "",
      frequency: medicineInput.frequency?.trim() || "",
      duration: medicineInput.duration?.trim() || "",
      startDate: medicineInput.startDate
        ? new Date(medicineInput.startDate)
        : FieldValue.serverTimestamp(),
      endDate: medicineInput.endDate ? new Date(medicineInput.endDate) : null,
      prescribedByUid: prescribedByUid || actor.uid,
      prescribedBy: prescribedBy || actor.displayName || "Doctor",
      notes:
        medicineInput.notes?.trim() ||
        (selectedMedicineDoc?.defaultNotes
          ? String(selectedMedicineDoc.defaultNotes)
          : ""),
      instructions: medicineInput.instructions?.trim() || "",
      customSuggestionId: suggestionId,
      suggestionStatus: suggestionId ? "pending" : "none",
      status: "Active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  await logAuditEvent({
    actor,
    module: "Medication",
    actionType: "Create",
    action: "Prescribed new medications",
    target: motherDoc.id,
    metadata: {
      motherUid,
      medicinesCount: medicines.length,
      suggestedCount,
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();
  const { medicationId, action, ...updates } = payload;

  if (!medicationId) {
    return NextResponse.json({ error: "Medication ID is required." }, { status: 400 });
  }

  const medicationRef = adminDb.collection("careMedications").doc(medicationId);
  const medicationDoc = await medicationRef.get();

  if (!medicationDoc.exists) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  if (action === "STOP") {
    await medicationRef.update({
      status: "Stopped",
      reasonStopped: updates.reasonStopped || "Stopped by doctor",
      endDate: new Date(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    await logAuditEvent({
      actor,
      module: "Medication",
      actionType: "Update",
      action: "Stopped medication",
      target: medicationDoc.data()?.motherUid || "Unknown",
      metadata: { medicationId, reason: updates.reasonStopped },
    });
    
    return NextResponse.json({ ok: true });
  }

  // Update details
  await medicationRef.update({
    medicationName: updates.medicationName ?? medicationDoc.data()?.medicationName,
    dosage: updates.dosage ?? medicationDoc.data()?.dosage,
    frequency: updates.frequency ?? medicationDoc.data()?.frequency,
    duration: updates.duration ?? medicationDoc.data()?.duration,
    startDate: updates.startDate ? new Date(updates.startDate) : medicationDoc.data()?.startDate,
    endDate: updates.endDate ? new Date(updates.endDate) : medicationDoc.data()?.endDate,
    notes: updates.notes ?? medicationDoc.data()?.notes,
    instructions: updates.instructions ?? medicationDoc.data()?.instructions,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    actor,
    module: "Medication",
    actionType: "Update",
    action: "Updated medication details",
    target: medicationDoc.data()?.motherUid || "Unknown",
    metadata: { medicationId },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return handleList();
}

export async function POST(request: NextRequest) {
  return handleAdd(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
