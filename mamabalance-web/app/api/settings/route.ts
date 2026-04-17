import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/log";
import { adminDb } from "@/lib/firebase/admin";
import type { StaffRole } from "@/lib/auth/types";
import { normalizePhoneNumber } from "@/lib/notify/sms";

type NotificationPreferences = Record<string, boolean>;

type SettingsFieldConfig = {
  key: string;
  label: string;
};

const SETTINGS_OPTIONS: Record<StaffRole, SettingsFieldConfig[]> = {
  superadmin: [
    { key: "supportTeamTickets", label: "Support team ticket alerts" },
    { key: "staffAccessChanges", label: "Staff account and access alerts" },
    { key: "educationalContentUpdates", label: "Educational content update alerts" },
  ],
  regionaladmin: [
    { key: "newUserRegistrationRequests", label: "New user registration requests" },
    { key: "regionalPerformanceSummaries", label: "Regional performance summaries" },
    { key: "educationalContentUpdates", label: "Educational content updates" },
  ],
  doctor: [
    { key: "assignmentAlerts", label: "Mother assignment alerts" },
    { key: "overdueCheckupAlerts", label: "Overdue checkup alerts" },
    { key: "midwifeObservationAlerts", label: "New midwife observation alerts" },
  ],
  midwife: [
    { key: "motherAssignmentAlerts", label: "Mother assignment alerts" },
    { key: "highRiskMotherAlerts", label: "High-risk mother alerts" },
    { key: "overdueVisitAlerts", label: "Overdue visit alerts" },
    { key: "doctorObservationAlerts", label: "New doctor observation alerts" },
  ],
};

function buildDefaultPreferences(role: StaffRole): NotificationPreferences {
  return Object.fromEntries(SETTINGS_OPTIONS[role].map((item) => [item.key, true]));
}

function normalizePreferences(
  role: StaffRole,
  stored: unknown,
): NotificationPreferences {
  const defaults = buildDefaultPreferences(role);
  const raw =
    stored && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, Boolean(raw[key] ?? defaults[key])]),
  );
}

function sanitizeText(value: unknown) {
  return String(value || "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function resolveRegionName(regionId: unknown) {
  const normalizedRegionId = sanitizeText(regionId);

  if (!normalizedRegionId) {
    return null;
  }

  const regionSnapshot = await adminDb.collection("regions").doc(normalizedRegionId).get();

  if (!regionSnapshot.exists) {
    return normalizedRegionId;
  }

  return (
    (regionSnapshot.data()?.name as string | undefined) ||
    normalizedRegionId
  );
}

async function handleGet() {
  const actor = await getCurrentSessionUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (actor.role === "mother") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snapshot = await adminDb.collection("users").doc(actor.uid).get();
  const data = snapshot.data() || {};
  const regionName = await resolveRegionName(data.regionId ?? actor.regionId);

  return NextResponse.json({
    profile: {
      displayName: sanitizeText(data.displayName || actor.displayName),
      loginEmail: sanitizeText(data.email || actor.email),
      contactEmail: sanitizeText(data.personalEmail || data.email || actor.email),
      phoneNumber: sanitizeText(data.phoneNumber),
      organization:
        actor.role === "superadmin"
          ? sanitizeText(data.organization) || "MamaBalance Central Team"
          : "",
      specialization:
        actor.role === "doctor"
          ? sanitizeText(data.specialization) || "Perinatal Mental Health"
          : "",
      regionName:
        actor.role === "regionaladmin" || actor.role === "midwife"
          ? regionName || "Unassigned Region"
          : "",
    },
    notificationPreferences: normalizePreferences(
      actor.role,
      data.notificationPreferences,
    ),
    notificationOptions: SETTINGS_OPTIONS[actor.role],
  });
}

async function handlePatch(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (actor.role === "mother") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json()) as {
    displayName?: string;
    contactEmail?: string;
    phoneNumber?: string;
    organization?: string;
    specialization?: string;
    notificationPreferences?: NotificationPreferences;
  };

  const displayName = sanitizeText(payload.displayName);
  const contactEmail = sanitizeText(payload.contactEmail).toLowerCase();
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
  const organization = sanitizeText(payload.organization);
  const specialization = sanitizeText(payload.specialization);

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  if (!contactEmail || !isValidEmail(contactEmail)) {
    return NextResponse.json({ error: "A valid contact email is required." }, { status: 400 });
  }

  const normalizedPreferences = normalizePreferences(
    actor.role,
    payload.notificationPreferences,
  );

  const updates: Record<string, unknown> = {
    displayName,
    personalEmail: contactEmail,
    phoneNumber,
    notificationPreferences: normalizedPreferences,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (actor.role === "superadmin") {
    updates.organization = organization || "MamaBalance Central Team";
  }

  if (actor.role === "doctor") {
    updates.specialization = specialization || "Perinatal Mental Health";
  }

  await adminDb.collection("users").doc(actor.uid).update(updates);

  await logAuditEvent({
    actor,
    module: "Settings",
    actionType: "Update",
    action: "Updated account settings",
    target: `${actor.role} settings`,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return handleGet();
}

export async function PATCH(request: NextRequest) {
  return handlePatch(request);
}
