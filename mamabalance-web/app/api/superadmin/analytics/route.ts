import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";

type RiskLevel = "low" | "moderate" | "high";
type TimeFilter = "week" | "month" | "year";

function toDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date })?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function resolveRiskLevel(mother: DocumentData | undefined): RiskLevel {
  const explicit = String(mother?.riskLevel || "").toLowerCase();
  if (explicit === "high" || explicit === "moderate" || explicit === "low") {
    return explicit as RiskLevel;
  }
  const latestEpdsScore = Number(mother?.latestEpdsScore ?? 0);
  if (mother?.isHighRisk || latestEpdsScore >= 20) return "high";
  if (latestEpdsScore >= 10) return "moderate";
  return "low";
}

function normalizeTimeFilter(value: string | null): TimeFilter {
  return value === "week" || value === "year" ? value : "month";
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildBuckets(timeFilter: TimeFilter) {
  const now = new Date();
  const labels =
    timeFilter === "week"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : timeFilter === "year"
        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const buckets = Object.fromEntries(labels.map((label) => [label, 0])) as Record<string, number>;

  if (timeFilter === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - start.getDay());
    const end = endOfDay(start);
    end.setDate(start.getDate() + 6);
    return { labels, buckets, start, end };
  }

  if (timeFilter === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = endOfDay(new Date(now.getFullYear(), 11, 31));
    return { labels, buckets, start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { labels, buckets, start, end };
}

function isInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function getBucketKey(date: Date, timeFilter: TimeFilter) {
  if (timeFilter === "week") return date.toLocaleDateString("en-US", { weekday: "short" });
  if (timeFilter === "year") return date.toLocaleDateString("en-US", { month: "short" });
  return `Week ${Math.ceil(date.getDate() / 7)}`;
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

function getMotherUser(motherDocId: string, mother: DocumentData, usersById: Map<string, DocumentData>) {
  const userUid = String(mother.userUid || mother.motherUid || mother.uid || "");
  return usersById.get(motherDocId) || (userUid ? usersById.get(userUid) : undefined);
}

export async function GET(request: Request) {
  const actor = await getCurrentSessionUser();
  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeFilter = normalizeTimeFilter(searchParams.get("filter"));

  try {
    const [usersSnapshot, mothersSnapshot, epdsSnapshot, regionsSnapshot, careObsSnapshot, midwifeObsSnapshot] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("mothers").get(),
      adminDb.collection("epdsAssessments").get(),
      adminDb.collection("regions").get(),
      adminDb.collection("careObservations").get(),
      adminDb.collection("midwifeObservations").get(),
    ]);

    const regionOptions = regionsSnapshot.empty
      ? DEFAULT_REGIONS
      : regionsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: normalizeRegionName(String(doc.data().name || doc.id)),
        }));

    const usersById = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const mothersById = new Map<string, DocumentData>();
    mothersSnapshot.docs.forEach((doc) => {
      const mother = doc.data();
      mothersById.set(doc.id, mother);
      [mother.userUid, mother.motherUid, mother.uid].forEach((value) => {
        const key = String(value || "");
        if (key) mothersById.set(key, mother);
      });
    });

    const stats = {
      totalMothers: 0,
      highRiskMothers: 0,
      totalDoctors: 0,
      totalMidwives: 0,
    };

    const riskCounts = { low: 0, moderate: 0, high: 0 };
    const regionalBreakdown: Record<string, {
      name: string;
      totalMothers: number;
      low: number;
      moderate: number;
      high: number;
      submissions: number; 
    }> = {};

    regionOptions.forEach(r => {
      regionalBreakdown[r.id] = {
        name: r.name,
        totalMothers: 0,
        low: 0,
        moderate: 0,
        high: 0,
        submissions: 0,
      };
    });

    // Populate stats and breakdown.
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.role === "doctor") stats.totalDoctors++;
      if (user.role === "midwife") stats.totalMidwives++;
    });

    mothersSnapshot.docs.forEach(doc => {
      const mother = doc.data();
      const user = getMotherUser(doc.id, mother, usersById);
      const risk = resolveRiskLevel(mother);
      const regionId = user?.regionId || mother.regionId || "unknown";

      stats.totalMothers++;
      if (risk === "high") stats.highRiskMothers++;
      riskCounts[risk]++;

      if (regionalBreakdown[regionId]) {
        regionalBreakdown[regionId].totalMothers++;
        regionalBreakdown[regionId][risk]++;
      }
    });

    // Generate trend data based on time filter
    const { labels: labelOrder, buckets: epdsBuckets, start, end } = buildBuckets(timeFilter);
    const { buckets: obsBuckets } = buildBuckets(timeFilter);
    let hasAssessmentDocs = false;

    // EPDS Activity
    epdsSnapshot.docs.forEach(doc => {
      const assessment = doc.data();
      const submittedAt = getActivityDate(assessment);
      if (!submittedAt) return;

      hasAssessmentDocs = true;

      const motherId = String(assessment.motherId || "");
      const motherUid = String(assessment.motherUid || assessment.userUid || "");
      const mother = mothersById.get(motherId) || mothersById.get(motherUid);
      const user = mother ? getMotherUser(motherId || motherUid, mother, usersById) : usersById.get(motherUid);
      const regionId = String(assessment.regionId || user?.regionId || mother?.regionId || "");
      if (regionalBreakdown[regionId]) regionalBreakdown[regionId].submissions++;

      if (!isInRange(submittedAt, start, end)) return;

      const key = getBucketKey(submittedAt, timeFilter);
      if (epdsBuckets[key] !== undefined) epdsBuckets[key]++;
    });

    if (!hasAssessmentDocs) {
      mothersSnapshot.docs.forEach(doc => {
        const mother = doc.data();
        // Only count if there is a real submission score.
        if (Number(mother.latestEpdsScore || 0) > 0) {
          const submittedAt = toDate(mother.latestEpdsSubmittedAt || mother.updatedAt);
          const user = getMotherUser(doc.id, mother, usersById);
          const regionId = String(user?.regionId || mother.regionId || "");
          if (regionalBreakdown[regionId]) regionalBreakdown[regionId].submissions++;

          if (submittedAt && isInRange(submittedAt, start, end)) {
            const key = getBucketKey(submittedAt, timeFilter);
            if (epdsBuckets[key] !== undefined) epdsBuckets[key]++;
          }
        }
      });
    }

    // Observation Activity
    [...careObsSnapshot.docs, ...midwifeObsSnapshot.docs].forEach(doc => {
      const obs = doc.data();
      const observedAt = toDate(obs.observedAt || obs.createdAt);
      if (observedAt && isInRange(observedAt, start, end)) {
        const key = getBucketKey(observedAt, timeFilter);
        if (obsBuckets[key] !== undefined) obsBuckets[key]++;
      }
    });

    return NextResponse.json({
      stats,
      riskDistribution: [
        { name: "Low", value: riskCounts.low, color: "#22c55e" },
        { name: "Moderate", value: riskCounts.moderate, color: "#fb923c" },
        { name: "High", value: riskCounts.high, color: "#dc2626" },
      ],
      epdsTrend: labelOrder.map(label => ({ label, value: epdsBuckets[label] })),
      obsTrend: labelOrder.map(label => ({ label, value: obsBuckets[label] })),
      regionalBreakdown: Object.values(regionalBreakdown),
    });

  } catch (error) {
    console.error("Superadmin Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
