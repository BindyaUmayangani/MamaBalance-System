import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";

type RiskLevel = "low" | "moderate" | "high";

function toDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value.toDate && typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function resolveRiskLevel(mother: any): RiskLevel {
  const explicit = String(mother?.riskLevel || "").toLowerCase();
  if (explicit === "high" || explicit === "moderate" || explicit === "low") {
    return explicit as RiskLevel;
  }
  const latestEpdsScore = Number(mother?.latestEpdsScore ?? 0);
  if (mother?.isHighRisk || latestEpdsScore >= 20) return "high";
  if (latestEpdsScore >= 10) return "moderate";
  return "low";
}

export async function GET(request: Request) {
  const actor = await getCurrentSessionUser();
  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeFilter = searchParams.get("filter") || "month"; // week, month, year

  try {
    const [usersSnapshot, mothersSnapshot, regionsSnapshot, careObsSnapshot, midwifeObsSnapshot] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("mothers").get(),
      adminDb.collection("regions").get(),
      adminDb.collection("careObservations").get(),
      adminDb.collection("midwifeObservations").get(),
    ]);

    const regionOptions = regionsSnapshot.empty
      ? DEFAULT_REGIONS
      : regionsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: String(doc.data().name || doc.id),
        }));

    const usersById = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));

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

    // Populate stats and breakdown (Submissions now includes both EPDS and Observations)
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.role === "doctor") stats.totalDoctors++;
      if (user.role === "midwife") stats.totalMidwives++;
    });

    mothersSnapshot.docs.forEach(doc => {
      const mother = doc.data();
      const user = usersById.get(doc.id);
      const risk = resolveRiskLevel(mother);
      const regionId = user?.regionId || mother.regionId || "unknown";

      stats.totalMothers++;
      if (risk === "high") stats.highRiskMothers++;
      riskCounts[risk]++;

      if (regionalBreakdown[regionId]) {
        regionalBreakdown[regionId].totalMothers++;
        regionalBreakdown[regionId][risk]++;
        if (Number(mother.latestEpdsScore || 0) > 0) {
          regionalBreakdown[regionId].submissions++;
        }
      }
    });

    // Count observations in regional breakdown
    [...careObsSnapshot.docs, ...midwifeObsSnapshot.docs].forEach(doc => {
      const obs = doc.data();
      const regionId = obs.regionId || (usersById.get(obs.motherUid)?.regionId) || "unknown";
      if (regionalBreakdown[regionId]) {
        regionalBreakdown[regionId].submissions++;
      }
    });

    // Generate trend data based on time filter
    const now = new Date();
    
    const getBucketKey = (date: Date) => {
      if (timeFilter === "week") return date.toLocaleDateString("en-US", { weekday: "short" });
      if (timeFilter === "month") return `Week ${Math.ceil(date.getDate() / 7)}`;
      return date.toLocaleDateString("en-US", { month: "short" });
    };

    const epdsBuckets: Record<string, number> = {};
    const obsBuckets: Record<string, number> = {};
    const labelOrder: string[] = [];

    if (timeFilter === "week") {
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => {
        epdsBuckets[d] = 0;
        obsBuckets[d] = 0;
        labelOrder.push(d);
      });
    } else if (timeFilter === "month") {
      ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].forEach(w => {
        epdsBuckets[w] = 0;
        obsBuckets[w] = 0;
        labelOrder.push(w);
      });
    } else {
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach(m => {
        epdsBuckets[m] = 0;
        obsBuckets[m] = 0;
        labelOrder.push(m);
      });
    }

    const isInRange = (date: Date) => {
      const diffMs = now.getTime() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (timeFilter === "week" && diffDays <= 7) return true;
      if (timeFilter === "month" && diffDays <= 30) return true;
      if (timeFilter === "year" && diffDays <= 365) return true;
      return false;
    };

    // EPDS Activity
    mothersSnapshot.docs.forEach(doc => {
      const mother = doc.data();
      // ONLY count if there is a real submission score > 0
      if (Number(mother.latestEpdsScore || 0) > 0) {
        const submittedAt = toDate(mother.latestEpdsSubmittedAt || mother.updatedAt);
        if (submittedAt && isInRange(submittedAt)) {
          const key = getBucketKey(submittedAt);
          if (epdsBuckets[key] !== undefined) epdsBuckets[key]++;
        }
      }
    });

    // Observation Activity
    [...careObsSnapshot.docs, ...midwifeObsSnapshot.docs].forEach(doc => {
      const obs = doc.data();
      const observedAt = toDate(obs.observedAt || obs.createdAt);
      if (observedAt && isInRange(observedAt)) {
        const key = getBucketKey(observedAt);
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
