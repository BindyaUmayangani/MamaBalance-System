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

function getMotherUser(motherDocId: string, mother: DocumentData, usersById: Map<string, DocumentData>) {
  const userUid = String(mother.userUid || mother.motherUid || mother.uid || "");
  return usersById.get(motherDocId) || (userUid ? usersById.get(userUid) : undefined);
}

function getMotherRegionId(motherDocId: string, mother: DocumentData, usersById: Map<string, DocumentData>) {
  const user = getMotherUser(motherDocId, mother, usersById);
  return String(user?.regionId || mother.regionId || "");
}

function getActivityDate(data: DocumentData) {
  return toDate(
    data.submittedAt ??
      data.observedAt ??
      data.completedAt ??
      data.scheduledAt ??
      data.createdAt ??
      data.updatedAt,
  );
}

function buildBuckets(timeFilter: string) {
  const labels =
    timeFilter === "week"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : timeFilter === "year"
        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  return {
    labels,
    buckets: Object.fromEntries(labels.map((label) => [label, 0])) as Record<string, number>,
  };
}

function getBucketKey(date: Date, timeFilter: string) {
  if (timeFilter === "week") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  if (timeFilter === "year") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }

  return `Week ${Math.ceil(date.getDate() / 7)}`;
}

function isInRange(date: Date, timeFilter: string) {
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

  if (timeFilter === "week") return diffDays >= 0 && diffDays <= 7;
  if (timeFilter === "year") return diffDays >= 0 && diffDays <= 365;
  return diffDays >= 0 && diffDays <= 31;
}

export async function GET(request: Request) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeFilter = searchParams.get("filter") || "month";

  const [
    usersSnapshot,
    mothersSnapshot,
    epdsSnapshot,
    regionsSnapshot,
    careObsSnapshot,
    midwifeObsSnapshot,
    visitsSnapshot,
    midwifeVisitsSnapshot,
  ] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("mothers").get(),
    adminDb.collection("epdsAssessments").get(),
    adminDb.collection("regions").get(),
    adminDb.collection("careObservations").get(),
    adminDb.collection("midwifeObservations").get(),
    adminDb.collection("visits").get(),
    adminDb.collection("midwifeVisits").get(),
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
  const regionalUsers = usersSnapshot.docs.filter((doc) => doc.data().regionId === actorRegionId);
  const regionalDoctors = regionalUsers.filter((doc) => doc.data().role === "doctor");
  const regionalMidwives = regionalUsers.filter((doc) => doc.data().role === "midwife");
  const regionalMotherIds = new Set<string>();
  const regionalMotherUserIds = new Set<string>();
  const regionalMotherById = new Map<string, DocumentData>();
  const riskCounts = { low: 0, moderate: 0, high: 0 };

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
      riskCounts[resolveRiskLevel(mother)] += 1;
    }

    return isRegionalMother;
  });

  const { labels: epdsLabels, buckets: epdsBuckets } = buildBuckets(timeFilter);
  const { labels: obsLabels, buckets: obsBuckets } = buildBuckets(timeFilter);
  let epdsSubmissions = 0;
  let observationTotal = 0;

  epdsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const motherId = String(data.motherId || "");
    const motherUid = String(data.motherUid || data.userUid || "");
    const isRegional =
      data.regionId === actorRegionId ||
      regionalMotherIds.has(motherId) ||
      regionalMotherUserIds.has(motherUid);

    if (!isRegional) return;
    epdsSubmissions += 1;

    const submittedAt = getActivityDate(data);
    if (!submittedAt || !isInRange(submittedAt, timeFilter)) return;

    const key = getBucketKey(submittedAt, timeFilter);
    if (epdsBuckets[key] !== undefined) epdsBuckets[key] += 1;
  });

  if (epdsSubmissions === 0) {
    regionalMothers.forEach((doc) => {
      const mother = doc.data();
      const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
      const submittedAt = toDate(mother.latestEpdsSubmittedAt ?? mother.latestEpdsAttemptedAt ?? mother.updatedAt);

      if (latestEpdsScore <= 0 || !submittedAt) return;
      epdsSubmissions += 1;
      if (!isInRange(submittedAt, timeFilter)) return;

      const key = getBucketKey(submittedAt, timeFilter);
      if (epdsBuckets[key] !== undefined) epdsBuckets[key] += 1;
    });
  }

  [...careObsSnapshot.docs, ...midwifeObsSnapshot.docs].forEach((doc) => {
    const data = doc.data();
    const motherUid = String(data.motherUid || data.motherId || "");
    const isRegional =
      data.regionId === actorRegionId ||
      regionalMotherIds.has(motherUid) ||
      regionalMotherUserIds.has(motherUid);

    if (!isRegional) return;
    observationTotal += 1;

    const observedAt = getActivityDate(data);
    if (!observedAt || !isInRange(observedAt, timeFilter)) return;

    const key = getBucketKey(observedAt, timeFilter);
    if (obsBuckets[key] !== undefined) obsBuckets[key] += 1;
  });

  const allVisitDocs = [...visitsSnapshot.docs, ...midwifeVisitsSnapshot.docs];
  const overdueFollowups = allVisitDocs.filter((doc) => {
    const data = doc.data();
    const motherUid = String(data.motherUid || data.motherId || "");
    const isRegional =
      data.regionId === actorRegionId ||
      regionalMotherIds.has(motherUid) ||
      regionalMotherUserIds.has(motherUid);
    if (!isRegional) return false;

    const status = String(data.status || "").toLowerCase();
    const scheduledAt = toDate(data.scheduledAt);
    return status === "overdue" || (!!scheduledAt && scheduledAt.getTime() < Date.now() && status !== "completed");
  }).length;

  const staffRows = [...regionalDoctors, ...regionalMidwives].map((doc) => {
    const user = doc.data();
    const role = String(user.role || "");
    const assigned = regionalMothers.filter((motherDoc) => {
      const mother = motherDoc.data();
      return role === "doctor"
        ? mother.assignedDoctorUid === doc.id
        : mother.assignedMidwifeUid === doc.id;
    });

    return {
      uid: doc.id,
      name: String(user.displayName || user.username || "Staff member"),
      role: role === "doctor" ? "Doctor" : "Midwife",
      assignedMothers: assigned.length,
      highRiskMothers: assigned.filter((motherDoc) => resolveRiskLevel(motherDoc.data()) === "high").length,
      observations: [...careObsSnapshot.docs, ...midwifeObsSnapshot.docs].filter((obsDoc) => {
        const obs = obsDoc.data();
        return obs.observedByUid === doc.id || obs.doctorId === doc.id || obs.midwifeUid === doc.id;
      }).length,
    };
  });

  return NextResponse.json({
    regionName,
    stats: {
      totalMothers: regionalMothers.length,
      highRiskMothers: riskCounts.high,
      totalDoctors: regionalDoctors.length,
      totalMidwives: regionalMidwives.length,
      epdsSubmissions,
      observations: observationTotal,
      overdueFollowups,
    },
    riskDistribution: [
      { name: "Low", value: riskCounts.low, color: "#22c55e" },
      { name: "Moderate", value: riskCounts.moderate, color: "#fb923c" },
      { name: "High", value: riskCounts.high, color: "#dc2626" },
    ],
    epdsTrend: epdsLabels.map((label) => ({ label, value: epdsBuckets[label] })),
    obsTrend: obsLabels.map((label) => ({ label, value: obsBuckets[label] })),
    careTeamBreakdown: staffRows,
  });
}
