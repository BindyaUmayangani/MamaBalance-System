import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { resolveLinkedDoctorUids } from "@/lib/doctor/identity";

type MedicationStatus = "Active" | "Completed" | "Stopped";

type MedicationRecord = {
  id: string;
  motherUid: string;
  motherName: string;
  motherUsername: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  updatedAt: string;
  status: MedicationStatus;
  notes: string;
  instructions: string;
  reasonStopped?: string;
};

function formatDosage(dosage: string) {
  return dosage ? dosage.replace(/mg/gi, "").trim() : "";
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function formatDate(dateValue: any) {
  if (!dateValue) return "";
  const dateObj = dateValue instanceof Date ? dateValue : dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
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
        motherName: mother?.name || "Unknown Mother",
        motherUsername: mother?.username || "-",
        medicationName: String(data.medicationName || ""),
        dosage: formatDosage(String(data.dosage || "")),
        frequency: String(data.frequency || ""),
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
  
  for (const med of medicines) {
    if (!med.medicationName) continue;
    const docRef = adminDb.collection("careMedications").doc();
    batch.set(docRef, {
      motherUid,
      medicationName: med.medicationName,
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      startDate: med.startDate ? new Date(med.startDate) : FieldValue.serverTimestamp(),
      endDate: med.endDate ? new Date(med.endDate) : null,
      prescribedByUid: prescribedByUid || actor.uid,
      prescribedBy: prescribedBy || actor.displayName || "Doctor",
      notes: med.notes || "",
      instructions: med.instructions || "",
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

export async function GET(request: NextRequest) {
  return handleList();
}

export async function POST(request: NextRequest) {
  return handleAdd(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
