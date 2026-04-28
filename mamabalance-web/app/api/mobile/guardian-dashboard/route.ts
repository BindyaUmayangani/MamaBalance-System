import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { readString, resolveMobileContext, toIso } from "@/lib/mobile/context";

function nextEpdsAvailableAt(value: unknown) {
  const iso = toIso(value);
  if (!iso) return null;
  const next = new Date(iso);
  next.setDate(next.getDate() + 7);
  return next.toISOString();
}

async function staffContact(uid: string, fallbackName: string) {
  if (!uid) return null;
  const doc = await adminDb.collection("users").doc(uid).get();
  const data = doc.data() || {};
  return {
    name: readString(data.displayName || data.fullName, fallbackName),
    phoneNumber: readString(data.phoneNumber, "-"),
  };
}

function emergencyContacts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    name: readString(item?.name, "Emergency contact"),
    relationship: readString(item?.relationship, "Support contact"),
    phoneNumber: readString(item?.phoneNumber, "-"),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    if (context.role !== "guardian") {
      return NextResponse.json({ error: "Only guardians can access this dashboard." }, { status: 403 });
    }

    const doctorUid = readString(context.mother.assignedDoctorUid);
    const midwifeUid = readString(context.mother.assignedMidwifeUid);
    const [doctor, midwife] = await Promise.all([
      staffContact(doctorUid, "Assigned doctor"),
      staffContact(midwifeUid, "Assigned midwife"),
    ]);

    return NextResponse.json({
      ok: true,
      dashboard: {
        guardianName: readString(context.user.displayName || context.user.fullName, "Guardian"),
        guardianPhoneNumber: readString(context.user.phoneNumber, "-"),
        motherName: readString(context.mother.fullName, "Mother"),
        motherPhoneNumber: readString(context.mother.phoneNumber, "-"),
        motherAddress: readString(context.mother.address, "-"),
        motherBirthdate: readString(context.mother.birthdate, "-"),
        motherDeliveryDate: readString(context.mother.deliveryDate, "-"),
        motherNoOfChildren: Number(context.mother.noOfChildren || 0),
        motherProfileImageUrl: readString(context.mother.profileImage),
        relationship: readString(context.guardianLink?.relationship, "Guardian"),
        nextEpdsAssessmentDate: nextEpdsAvailableAt(context.mother.latestEpdsSubmittedAt),
        doctor,
        midwife: midwife || { name: "Assigned midwife", phoneNumber: "-" },
        emergencyContacts: emergencyContacts(context.mother.emergencyContacts),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load guardian dashboard.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
