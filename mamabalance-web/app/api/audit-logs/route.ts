import { NextRequest, NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

type AuditLogRow = {
  id: string;
  timestamp: string | null;
  actor: string;
  actorRole: string;
  regionId: string | null;
  region: string;
  module: string;
  actionType: string;
  action: string;
  target: string;
};

function formatIso(value: unknown) {
  return value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : null;
}

export async function GET(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope");
  const snapshot = await adminDb.collection("auditLogs").get();
  const regionalRoles = new Set(["regionaladmin", "doctor", "midwife"]);

  const rows = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: formatIso(data.createdAt),
        actor: String(data.actorLabel || data.actorName || "Unknown Actor"),
        actorRole: String(data.actorRole || "-"),
        regionId: (data.regionId as string | undefined) || null,
        region: String(data.regionName || "Global"),
        module: String(data.module || "System"),
        actionType: String(data.actionType || "Update"),
        action: String(data.action || "-"),
        target: String(data.target || "-"),
      } satisfies AuditLogRow;
    })
    .filter((row) =>
      actor.role === "regionaladmin"
        ? row.regionId === actor.regionId || row.region === "Global"
        : true,
    )
    .sort((left, right) => {
      const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
      const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
      return rightTime - leftTime;
    });

  const filteredRows =
    scope === "regionaladmin"
      ? rows.filter((row) =>
          actor.role === "regionaladmin"
            ? row.regionId === actor.regionId && regionalRoles.has(row.actorRole)
            : regionalRoles.has(row.actorRole),
        )
      : rows;

  const regions = Array.from(
    new Set(filteredRows.map((row) => row.region).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const modules = Array.from(new Set(filteredRows.map((row) => row.module))).sort((left, right) =>
    left.localeCompare(right),
  );

  const actionTypes = Array.from(new Set(filteredRows.map((row) => row.actionType))).sort(
    (left, right) => left.localeCompare(right),
  );

  const actorRoles = Array.from(new Set(filteredRows.map((row) => row.actorRole))).sort(
    (left, right) => left.localeCompare(right),
  );

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const last24hEvents = filteredRows.filter((row) => {
    if (!row.timestamp) return false;
    return new Date(row.timestamp).getTime() >= last24Hours;
  });

  return NextResponse.json({
    logs: filteredRows,
    filters: {
      regions,
      modules,
      actionTypes,
      actorRoles,
    },
    stats: {
      total24h: last24hEvents.length,
      userEvents: filteredRows.filter((row) =>
        ["Users", "Visits", "Observations"].includes(row.module),
      ).length,
      securityEvents: filteredRows.filter(
        (row) =>
          row.module === "Security" ||
          row.module === "Support" ||
          row.module === "Notifications" ||
          row.module === "Settings",
      ).length,
      contentEvents: filteredRows.filter((row) => row.module === "Content").length,
    },
  });
}
