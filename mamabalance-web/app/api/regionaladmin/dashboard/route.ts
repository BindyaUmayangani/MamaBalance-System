import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

type RiskLevel = "low" | "moderate" | "high";

function toDate(value: unknown) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: unknown) {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleString("en-LK", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveRiskLevel(mother: DocumentData | undefined): RiskLevel {
  const explicit = String(mother?.riskLevel || "").toLowerCase();

  if (explicit === "high" || explicit === "moderate" || explicit === "low") {
    return explicit;
  }

  const latestEpdsScore = Number(mother?.latestEpdsScore ?? 0);
  if (mother?.isHighRisk || latestEpdsScore >= 20) return "high";
  if (latestEpdsScore >= 10) return "moderate";
  return "low";
}

function resolveLatestEpdsDate(mother: DocumentData | undefined, user: DocumentData | undefined) {
  return (
    mother?.latestEpdsSubmittedAt ??
    mother?.latestEpdsAttemptedAt ??
    mother?.latestEpdsCreatedAt ??
    mother?.updatedAt ??
    user?.updatedAt ??
    mother?.createdAt ??
    user?.createdAt
  );
}

function buildWeekBuckets() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: date.toISOString().slice(0, 10),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: 0,
    };
  });
}

function getMotherUser(motherDocId: string, mother: DocumentData, usersById: Map<string, DocumentData>) {
  const userUid = String(mother.userUid || mother.motherUid || mother.uid || "");
  return usersById.get(motherDocId) || (userUid ? usersById.get(userUid) : undefined);
}

function getMotherRegionId(motherDocId: string, mother: DocumentData, usersById: Map<string, DocumentData>) {
  const user = getMotherUser(motherDocId, mother, usersById);
  return String(user?.regionId || mother.regionId || "");
}

function getAssessmentDate(assessment: DocumentData) {
  return toDate(
    assessment.submittedAt ??
      assessment.createdAt ??
      assessment.attemptedAt ??
      assessment.updatedAt,
  );
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [
    usersSnapshot,
    mothersSnapshot,
    epdsSnapshot,
    regionsSnapshot,
    auditSnapshot,
    notificationsSnapshot,
  ] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("mothers").get(),
    adminDb.collection("epdsAssessments").get(),
    adminDb.collection("regions").get(),
    adminDb.collection("auditLogs").get(),
    adminDb.collection("notifications").where("recipientUid", "==", actor.uid).get(),
  ]);

  const regionOptions = regionsSnapshot.empty
    ? DEFAULT_REGIONS
    : regionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name || doc.id),
      }));
  const regionMap = new Map(regionOptions.map((region) => [region.id, region.name]));
  const actorRegionId = actor.regionId || "";
  const regionName = normalizeRegionName(regionMap.get(actorRegionId) || actorRegionId || "Assigned region");
  const usersById = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const regionalUserDocs = usersSnapshot.docs.filter((doc) => doc.data().regionId === actorRegionId);
  const roleCounts = {
    doctors: 0,
    midwives: 0,
    mothers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  };

  regionalUserDocs.forEach((doc) => {
    const user = doc.data();
    const role = String(user.role || "");

    if (role === "doctor") roleCounts.doctors += 1;
    if (role === "midwife") roleCounts.midwives += 1;
    if (role === "mother") roleCounts.mothers += 1;

    if (user.status === "active") {
      roleCounts.activeUsers += 1;
    } else {
      roleCounts.inactiveUsers += 1;
    }
  });

  const riskCounts = { low: 0, moderate: 0, high: 0 };
  const weekBuckets = buildWeekBuckets();
  const weekBucketMap = new Map(weekBuckets.map((bucket) => [bucket.key, bucket]));
  const regionalMotherIds = new Set<string>();
  const regionalMotherUserIds = new Set<string>();
  const regionalMotherById = new Map<string, DocumentData>();
  const regionalMothers = mothersSnapshot.docs.filter((doc) => {
    const mother = doc.data();
    const user = getMotherUser(doc.id, mother, usersById);
    const isRegionalMother = getMotherRegionId(doc.id, mother, usersById) === actorRegionId;

    if (isRegionalMother) {
      regionalMotherIds.add(doc.id);
      regionalMotherById.set(doc.id, mother);
      if (user?.uid) regionalMotherUserIds.add(String(user.uid));
      if (mother.userUid) regionalMotherUserIds.add(String(mother.userUid));
      if (mother.motherUid) regionalMotherUserIds.add(String(mother.motherUid));
    }

    return isRegionalMother;
  });

  const highRiskMothers = regionalMothers
    .map((doc) => {
      const mother = doc.data();
      const user = getMotherUser(doc.id, mother, usersById);
      const risk = resolveRiskLevel(mother);
      const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
      const latestEpdsDate = resolveLatestEpdsDate(mother, user);
      const latestDate = toDate(latestEpdsDate);

      riskCounts[risk] += 1;

      return {
        uid: String(user?.uid || mother.userUid || doc.id),
        userId: String(user?.userId || mother.userId || doc.id),
        name: String(mother.fullName || user?.displayName || "Unknown Mother"),
        username: String(mother.username || user?.username || "-"),
        risk,
        score: Number.isFinite(latestEpdsScore) && latestEpdsScore > 0 ? latestEpdsScore : null,
        assignedMidwife: String(mother.assignedMidwifeUid ? usersById.get(mother.assignedMidwifeUid)?.displayName || "-" : "-"),
        assignedDoctor: String(mother.assignedDoctorUid ? usersById.get(mother.assignedDoctorUid)?.displayName || "-" : "-"),
        lastActivityAt: latestDate?.getTime() ?? 0,
        lastActivity: formatDateTime(latestEpdsDate),
      };
    })
    .filter((mother) => mother.risk === "high")
    .sort((first, second) => second.lastActivityAt - first.lastActivityAt)
    .slice(0, 4);

  let hasRegionalAssessmentDocs = false;
  epdsSnapshot.docs.forEach((doc) => {
    const assessment = doc.data();
    const motherId = String(assessment.motherId || "");
    const motherUid = String(assessment.motherUid || assessment.userUid || "");
    const assessmentRegionId = String(assessment.regionId || "");
    const mother = motherId ? regionalMotherById.get(motherId) : undefined;
    const isRegionalAssessment =
      assessmentRegionId === actorRegionId ||
      regionalMotherIds.has(motherId) ||
      regionalMotherUserIds.has(motherUid) ||
      (mother ? getMotherRegionId(motherId, mother, usersById) === actorRegionId : false);

    if (!isRegionalAssessment) return;

    hasRegionalAssessmentDocs = true;

    const submittedAt = getAssessmentDate(assessment);
    if (!submittedAt) return;

    const bucket = weekBucketMap.get(submittedAt.toISOString().slice(0, 10));
    if (!bucket) return;

    bucket.value += 1;
  });

  if (!hasRegionalAssessmentDocs) {
    regionalMothers.forEach((doc) => {
      const mother = doc.data();
      const user = getMotherUser(doc.id, mother, usersById);
      const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
      const latestDate = toDate(resolveLatestEpdsDate(mother, user));

      if (latestEpdsScore > 0 && latestDate) {
        const bucket = weekBucketMap.get(latestDate.toISOString().slice(0, 10));
        if (bucket) bucket.value += 1;
      }
    });
  }

  const recentAudit = auditSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const createdAt = toDate(data.createdAt);

      return {
        id: doc.id,
        actor: String(data.actorLabel || data.actorName || "Unknown Actor"),
        actorRole: String(data.actorRole || "-"),
        module: String(data.module || "System"),
        actionType: String(data.actionType || "Update"),
        action: String(data.action || "-"),
        regionId: String(data.regionId || ""),
        region: String(data.regionName || regionName),
        createdLabel: formatDateTime(data.createdAt),
        sortTime: createdAt?.getTime() ?? 0,
      };
    })
    .filter((item) => !item.regionId || item.regionId === actorRegionId)
    .sort((first, second) => second.sortTime - first.sortTime)
    .slice(0, 4);

  const unreadCount = notificationsSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.recipientRole === "regionaladmin" && !data.read;
  }).length;

  return NextResponse.json({
    displayName: actor.displayName || "Regional Admin",
    regionName,
    unreadCount,
    stats: {
      totalDoctors: roleCounts.doctors,
      totalMidwives: roleCounts.midwives,
      totalMothers: roleCounts.mothers || regionalMothers.length,
      highRiskMothers: riskCounts.high,
      activeUsers: roleCounts.activeUsers,
      inactiveUsers: roleCounts.inactiveUsers,
    },
    riskDistribution: [
      { name: "Low", value: riskCounts.low, color: "#22c55e" },
      { name: "Moderate", value: riskCounts.moderate, color: "#fb923c" },
      { name: "High", value: riskCounts.high, color: "#dc2626" },
    ],
    weeklyEpds: weekBuckets,
    highRiskMothers,
    recentAudit,
  });
}
