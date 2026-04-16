import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  loadMidwifeMothersByLinkedUids,
  resolveLinkedMidwifeUids,
} from "@/lib/midwife/identity";

type MedicationStatus = "Active" | "Completed" | "Stopped";

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

function formatDate(value: unknown) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);
  const assignedMotherDocs = await loadMidwifeMothersByLinkedUids(linkedMidwifeUids);

  if (assignedMotherDocs.length === 0) {
    return NextResponse.json({ medications: [] });
  }

  const motherUids = assignedMotherDocs.map((doc) => doc.uid);
  const userSnapshots = await Promise.all(
    motherUids.map((uid) => adminDb.collection("users").doc(uid).get()),
  );
  const userMap = new Map(
    userSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );
  const motherMap = new Map(
    assignedMotherDocs.map((doc) => {
      const mother = doc.data;
      const user = userMap.get(doc.uid);

      return [
        doc.uid,
        {
          name: String(mother.fullName || user?.displayName || "Unknown Mother"),
          username: String(mother.username || user?.username || "-"),
        },
      ];
    }),
  );

  const medicationSnapshots = await Promise.all(
    chunk(motherUids, 10).map((uids) =>
      adminDb.collection("careMedications").where("motherUid", "in", uids).get(),
    ),
  );

  const doctorUids = new Set<string>();
  medicationSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const prescribedByUid = String(doc.data().prescribedByUid || "");

      if (prescribedByUid) {
        doctorUids.add(prescribedByUid);
      }
    });
  });

  const doctorMap = new Map<string, string>();
  if (doctorUids.size > 0) {
    const doctorDocs = await Promise.all(
      Array.from(doctorUids).map((uid) => adminDb.collection("users").doc(uid).get()),
    );

    doctorDocs.forEach((doc) => {
      if (doc.exists) {
        doctorMap.set(doc.id, String(doc.data()?.displayName || "Unknown Doctor"));
      }
    });
  }

  const medications = medicationSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => {
      const data = doc.data();
      const motherUid = String(data.motherUid || "");
      const mother = motherMap.get(motherUid);
      const doctorName =
        doctorMap.get(String(data.prescribedByUid || "")) ||
        String(data.prescribedBy || "Unknown Doctor");

      return {
        id: doc.id,
        motherUid,
        motherName: mother?.name || "Unknown Mother",
        motherUsername: mother?.username || "-",
        medicationName: String(data.medicationName || ""),
        dosage: String(data.dosage || "").replace(/mg/gi, "").trim(),
        frequency: String(data.frequency || ""),
        startDate: formatDate(data.startDate || data.createdAt),
        endDate: formatDate(data.endDate),
        prescribedBy: doctorName,
        updatedAt: formatDate(data.updatedAt || data.createdAt),
        status: (String(data.status || "Active") as MedicationStatus) || "Active",
        notes: String(data.notes || ""),
        instructions: String(data.instructions || ""),
        reasonStopped: data.reasonStopped ? String(data.reasonStopped) : undefined,
      };
    }),
  );

  medications.sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
  );

  return NextResponse.json({ medications });
}
