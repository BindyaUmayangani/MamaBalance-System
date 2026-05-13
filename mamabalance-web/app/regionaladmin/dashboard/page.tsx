"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";
import "@/app/midwife/styles/MidwifeDashboard.css";
import "@/app/superadmin/styles/SuperadminDashboard.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DashboardPayload = {
  displayName: string;
  regionName: string;
  stats: {
    totalDoctors: number;
    totalMidwives: number;
    totalMothers: number;
    highRiskMothers: number;
    activeUsers: number;
    inactiveUsers: number;
  };
  riskDistribution: Array<{ name: string; value: number; color: string }>;
  weeklyEpds: Array<{ day: string; value: number }>;
  recentAudit: Array<{
    id: string;
    actor: string;
    actorRole: string;
    module: string;
    actionType: string;
    action: string;
    region: string;
    createdLabel: string;
  }>;
};

const EMPTY_DASHBOARD: DashboardPayload = {
  displayName: "Regional Admin",
  regionName: "Assigned region",
  stats: {
    totalDoctors: 0,
    totalMidwives: 0,
    totalMothers: 0,
    highRiskMothers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  },
  riskDistribution: [
    { name: "Low", value: 0, color: "#22c55e" },
    { name: "Moderate", value: 0, color: "#fb923c" },
    { name: "High", value: 0, color: "#dc2626" },
  ],
  weeklyEpds: [],
  recentAudit: [],
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatShare(count: number, total: number) {
  if (total === 0) return "0% of mothers";
  return `${Math.round((count / total) * 100)}% of mothers`;
}

function normalizeWeeklyEpds(data: Array<{ day: string; value: number }>) {
  const valuesByDay = new Map(data.map((item) => [item.day.slice(0, 3), item.value]));
  return WEEK_DAYS.map((day) => ({
    day,
    value: valuesByDay.get(day) ?? 0,
  }));
}

function niceYAxisMax(dataMax: number) {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 5;
  const padded = Math.ceil(dataMax * 1.2);
  if (padded <= 5) return 5;
  if (padded <= 10) return 10;
  return Math.ceil(padded / 5) * 5;
}

export default function RegionalAdminDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardPayload>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/regionaladmin/dashboard", { cache: "no-store" });
        const payload = (await response.json()) as DashboardPayload & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load dashboard.");
        }

        if (isMounted) setDashboard(payload);
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const totalMothers = dashboard.stats.totalMothers;
    const careSummary = [
      {
        id: "doctors",
        label: "Doctors",
        count: dashboard.stats.totalDoctors,
        tone: "low",
        share: `${formatShare(dashboard.stats.totalDoctors, totalMothers)} care capacity`,
      },
      {
        id: "midwives",
        label: "Midwives",
        count: dashboard.stats.totalMidwives,
        tone: "moderate",
        share: `${formatShare(dashboard.stats.totalMidwives, totalMothers)} field coverage`,
      },
      {
        id: "high-risk",
        label: "High-Risk",
        count: dashboard.stats.highRiskMothers,
        tone: "high",
        share: formatShare(dashboard.stats.highRiskMothers, totalMothers),
      },
    ] as const;

    return {
      careSummary,
      weeklyEpds: normalizeWeeklyEpds(dashboard.weeklyEpds),
    };
  }, [dashboard]);

  return (
    <div className="midwife-dashboard doctor-dashboard-page superadmin-dashboard-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Regional Dashboard</h1>
          <p>
            Monitor mothers, care teams, EPDS activity, and recent operational activity for {dashboard.regionName}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading regional dashboard..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="midwife-top-grid">
            <div className="dashboard-card mothers-card">
              <h3>Regional Coverage</h3>

              <div className="care-modern-wrap">
                <div className="care-total-card">
                  <div>
                    <p>Total Mothers Registered</p>
                    <h2>{formatCount(dashboard.stats.totalMothers)}</h2>
                    <span className="care-total-chip">
                      {formatCount(dashboard.stats.activeUsers)} active regional users
                    </span>
                  </div>
                  <span className="care-total-icon">
                    <Users size={22} />
                  </span>
                </div>

                <div className="care-risk-grid">
                  {dashboardData.careSummary.map((item) => (
                    <div key={item.id} className={`care-risk-card ${item.tone}`}>
                      <div className="care-risk-top">
                        <p>{item.label}</p>
                        {item.id === "high-risk" ? <AlertTriangle size={14} /> : null}
                      </div>
                      <h4>{formatCount(item.count)}</h4>
                      <small>{item.share}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashboard-card checkup-card">
              <div className="checkup-header">
                <div>
                  <h3 className="checkup-title">Regional Overview</h3>
                </div>
              </div>

              <div className="visit-panels">
                <div className="visit-panel">
                  <div className="visit-panel-header">
                    <h4>Weekly EPDS Submissions</h4>
                    <div className="visit-panel-actions">
                      <Activity size={18} />
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 210 }}>
                    <ResponsiveContainer>
                      <BarChart data={dashboardData.weeklyEpds} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} interval={0} tickMargin={8} tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <YAxis allowDecimals={false} domain={[0, niceYAxisMax]} tickCount={6} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <Tooltip cursor={{ fill: "#eefaf5" }} contentStyle={{ borderRadius: "12px", border: "none" }} />
                        <Bar dataKey="value" fill="#499d85" radius={[8, 8, 0, 0]} maxBarSize={42} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="recent-mothers-card">
            <div className="table-header recent-mothers-header">
              <div>
                <p className="section-eyebrow">Risk Intelligence</p>
                <h3>Regional Risk Distribution</h3>
              </div>
            </div>

            <div className="superadmin-chart-row">
              <div className="superadmin-risk-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dashboard.riskDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {dashboard.riskDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="superadmin-risk-list">
                {dashboard.riskDistribution.map((item) => (
                  <div key={item.name} className="recent-mother-item compact">
                    <div className="recent-mother-top">
                      <div>
                        <h4>{item.name} Risk</h4>
                        <p>{formatShare(item.value, dashboard.stats.totalMothers)}</p>
                      </div>
                      <span className={`risk-badge soft ${item.name.toLowerCase()}`}>
                        {formatCount(item.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="recent-mothers-card">
            <div className="table-header recent-mothers-header">
              <div>
                <p className="section-eyebrow">Operations</p>
                <h3>Recent Regional Activity</h3>
              </div>

              <button className="btn-primary" onClick={() => router.push("/regionaladmin/audit-logs")}>
                View Audit Logs
              </button>
            </div>

            <div className="recent-mothers-grid">
              {dashboard.recentAudit.length > 0 ? (
                dashboard.recentAudit.map((item) => (
                  <article key={item.id} className="recent-mother-item">
                    <div className="recent-mother-top">
                      <div>
                        <h4>{item.module}</h4>
                        <p>{item.actor} - {item.actorRole}</p>
                      </div>
                      <span className="risk-badge soft moderate">{item.actionType}</span>
                    </div>

                    <div className="recent-mother-footer">
                      <p>{item.action}</p>
                      <span className="visit-row-time">{item.createdLabel}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="recent-mothers-empty">
                  <h4>No recent audit activity</h4>
                  <p>Regional changes will appear here once audit logs are created.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
