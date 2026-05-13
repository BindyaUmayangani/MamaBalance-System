import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

import { DEFAULT_REGIONS, normalizeRegionName } from "@/lib/admin/regions";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { buildSuperadminNotifications } from "@/lib/superadmin/notifications";

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

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
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
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);

    return {
      key: dateKey(date),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: 0,
    };
  });
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [usersSnapshot, mothersSnapshot, regionsSnapshot, auditSnapshot] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("mothers").get(),
    adminDb.collection("regions").get(),
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(12).get(),
  ]);

  const regionOptions = regionsSnapshot.empty
    ? DEFAULT_REGIONS
    : regionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name || doc.id),
      }));
  const regionMap = new Map(regionOptions.map((region) => [region.id, region.name]));
  const usersById = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const roleCounts = {
    regionalAdmins: 0,
    doctors: 0,
    midwives: 0,
    mothers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  };

  usersSnapshot.docs.forEach((doc) => {
    const user = doc.data();
    const role = String(user.role || "");

    if (role === "regionaladmin") roleCounts.regionalAdmins += 1;
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
  const highRiskMothers = mothersSnapshot.docs
    .map((doc) => {
      const mother = doc.data();
      const user = usersById.get(doc.id);
      const risk = resolveRiskLevel(mother);
      const latestEpdsScore = Number(mother.latestEpdsScore ?? 0);
      const latestEpdsDate = resolveLatestEpdsDate(mother, user);
      const latestDate = toDate(latestEpdsDate);

      riskCounts[risk] += 1;

      if (latestEpdsScore > 0 && latestDate) {
        const bucket = weekBucketMap.get(dateKey(latestDate));
        if (bucket) bucket.value += 1;
      }

      return {
        uid: doc.id,
        userId: String(user?.userId || mother.userId || doc.id),
        name: String(mother.fullName || user?.displayName || "Unknown Mother"),
        username: String(mother.username || user?.username || "-"),
        risk,
        score: Number.isFinite(latestEpdsScore) && latestEpdsScore > 0 ? latestEpdsScore : null,
        region: normalizeRegionName(
          regionMap.get(String(user?.regionId || mother.regionId || "")) ||
            String(user?.regionName || mother.regionName || "Assigned region"),
        ),
        lastActivityAt: latestDate?.getTime() ?? 0,
        lastActivity: formatDateTime(latestEpdsDate),
      };
    })
    .filter((mother) => mother.risk === "high")
    .sort((first, second) => second.lastActivityAt - first.lastActivityAt)
    .slice(0, 4);

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
        region: String(data.regionName || "Global"),
        createdLabel: formatDateTime(data.createdAt),
        sortTime: createdAt?.getTime() ?? 0,
      };
    })
    .sort((first, second) => second.sortTime - first.sortTime)
    .slice(0, 4);

  const unreadCount = (await buildSuperadminNotifications(actor.uid)).filter((item) => !item.read).length;

  return NextResponse.json({
    displayName: actor.displayName || "Super Admin",
    stats: {
      totalAdmins: roleCounts.regionalAdmins,
      totalDoctors: roleCounts.doctors,
      totalMidwives: roleCounts.midwives,
      totalMothers: roleCounts.mothers,
      highRiskMothers: riskCounts.high,
      activeUsers: roleCounts.activeUsers,
      inactiveUsers: roleCounts.inactiveUsers,
      regions: regionOptions.length,
    },
    riskDistribution: [
      { name: "Low", value: riskCounts.low, color: "#22c55e" },
      { name: "Moderate", value: riskCounts.moderate, color: "#fb923c" },
      { name: "High", value: riskCounts.high, color: "#dc2626" },
    ],
    weeklyEpds: weekBuckets,
    highRiskMothers,
    recentAudit,
    unreadCount,
  });
}
