import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildMedicineDisplayName,
  getMedicineFormLabel,
  type MedicineForm,
} from "@/lib/medicine/types";

type DoctorMedicineCatalogItem = {
  id: string;
  medicineId: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: MedicineForm;
  formLabel: string;
  defaultNotes: string;
  displayName: string;
};

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("medicines")
    .where("status", "==", "active")
    .get();

  const medicines: DoctorMedicineCatalogItem[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const brandName = String(data.brandName || "");
      const genericName = String(data.genericName || "");
      const strength = String(data.strength || "");
      const form = String(data.form || "other") as MedicineForm;

      return {
        id: doc.id,
        medicineId: String(data.medicineId || ""),
        brandName,
        genericName,
        strength,
        form,
        formLabel: getMedicineFormLabel(form),
        defaultNotes: String(data.defaultNotes || ""),
        displayName: buildMedicineDisplayName({
          brandName,
          genericName,
          strength,
        }),
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  return NextResponse.json({ medicines });
}

