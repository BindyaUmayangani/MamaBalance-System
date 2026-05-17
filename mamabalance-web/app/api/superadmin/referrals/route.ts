import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

type ReferralType = "doctor" | "midwife" | "mother";
type ReferralStatus = "pending" | "accepted" | "rejected";

const REFERRAL_TYPES = new Set<ReferralType>(["doctor", "midwife", "mother"]);
const REFERRAL_STATUSES = new Set<ReferralStatus>(["pending", "accepted", "rejected"]);

function toIsoString(value: unknown) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function loadRegions() {
  const snapshot = await adminDb.collection("regions").get();

  if (snapshot.empty) {
    return DEFAULT_REGIONS;
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name || doc.id),
  }));
}

function resolveType(data: DocumentData): ReferralType {
  return REFERRAL_TYPES.has(data.type as ReferralType)
    ? (data.type as ReferralType)
    : "mother";
}

function resolveStatus(data: DocumentData): ReferralStatus {
  return REFERRAL_STATUSES.has(data.status as ReferralStatus)
    ? (data.status as ReferralStatus)
    : "pending";
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [regions, referralsSnapshot] = await Promise.all([
    loadRegions(),
    adminDb.collection("regionTransfers").get(),
  ]);
  const regionMap = new Map(regions.map((region) => [region.id, region.name]));

  const referrals = referralsSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const sourceRegionId = String(data.sourceRegionId || "");
      const targetRegionId = String(data.targetRegionId || "");

      return {
        id: doc.id,
        type: resolveType(data),
        status: resolveStatus(data),
        userUid: String(data.userUid || ""),
        userId: String(data.userId || ""),
        userName: String(data.userName || "Unknown user"),
        sourceRegionId,
        sourceRegionName: normalizeRegionName(
          String(data.sourceRegionName || regionMap.get(sourceRegionId) || sourceRegionId),
        ),
        targetRegionId,
        targetRegionName: normalizeRegionName(
          String(data.targetRegionName || regionMap.get(targetRegionId) || targetRegionId),
        ),
        reason: String(data.reason || ""),
        requestedByUid: String(data.requestedByUid || ""),
        requestedByName: String(data.requestedByName || "Regional Admin"),
        decidedByUid: data.decidedByUid ? String(data.decidedByUid) : null,
        decidedByName: data.decidedByName ? String(data.decidedByName) : null,
        assignedMidwifeUid: data.assignedMidwifeUid ? String(data.assignedMidwifeUid) : null,
        assignedMidwifeName: data.assignedMidwifeName ? String(data.assignedMidwifeName) : null,
        guardianUid: data.guardianUid ? String(data.guardianUid) : null,
        guardianName: data.guardianName ? String(data.guardianName) : null,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
        decidedAt: toIsoString(data.decidedAt),
      };
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

  return NextResponse.json({
    referrals,
    regions,
    stats: {
      total: referrals.length,
      pending: referrals.filter((item) => item.status === "pending").length,
      accepted: referrals.filter((item) => item.status === "accepted").length,
      rejected: referrals.filter((item) => item.status === "rejected").length,
    },
  });
}
