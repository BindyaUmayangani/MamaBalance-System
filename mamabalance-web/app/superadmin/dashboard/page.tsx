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

/* ===== COLORS ===== */
const COLORS = {
  low: "#22c55e",
  moderate: "#fb923c",
  high: "#dc2626",
  bar: "#7ccfb2",
};

function LegacySuperAdminDashboard() {
  /* ===== BAR CHART DATA ===== */
  const weeklyEPDS = [
    { day: "Mon", value: 45 },
    { day: "Tue", value: 55 },
    { day: "Wed", value: 70 },
    { day: "Thu", value: 30 },
    { day: "Fri", value: 80 },
    { day: "Sat", value: 50 },
    { day: "Sun", value: 35 },
  ];

  /* ===== DONUT DATA ===== */
  const riskDistribution = [
    { name: "Low Risk", value: 76, color: COLORS.low },
    { name: "Moderate Risk", value: 20, color: COLORS.moderate },
    { name: "High Risk", value: 4, color: COLORS.high },
  ];

  return (
    <div className="dashboard">
      {/* ================= HEADER ================= */}
      <h1 className="dashboard-title">Hello, Super Admin 👋</h1>

      {/* ================= STATS (5 CARDS) ================= */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Admins</h3>
          <span>12</span>
        </div>

        <div className="stat-card">
          <h3>Total Doctors</h3>
          <span>86</span>
        </div>

        <div className="stat-card">
          <h3>Total Midwives</h3>
          <span>124</span>
        </div>

        <div className="stat-card">
          <h3>Total Mothers</h3>
          <span>3,420</span>
        </div>

        <div className="stat-card">
          <h3>High-Risk Mothers</h3>
          <span style={{ color: COLORS.high }}>124</span>
        </div>
      </div>

      {/* ================= CHARTS ================= */}
      <div className="charts-grid">
        {/* ===== WEEKLY BAR CHART ===== */}
        <div className="chart-card">
          <h3 className="chart-title">
            Weekly EPDS Submissions (System-wide)
          </h3>

          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart
                data={weeklyEPDS}
                margin={{ top: 30, right: 20, left: 0, bottom: 10 }}
              >
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill={COLORS.bar}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== DONUT CHART ===== */}
        <div className="chart-card">
          <h3 className="chart-title">Overall Risk Distribution</h3>

          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart margin={{ top: -0, bottom: 20 }}>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ===== LEGEND ===== */}
          <div className="legend-table">
            {riskDistribution.map((r) => (
              <div className="legend-row" key={r.name}>
                <span className="status">
                  <i
                    className="dot"
                    style={{ background: r.color }}
                  />
                  {r.name}
                </span>
                <span>{r.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type DashboardPayload = {
  displayName: string;
  stats: {
    totalAdmins: number;
    totalDoctors: number;
    totalMidwives: number;
    totalMothers: number;
    highRiskMothers: number;
    activeUsers: number;
    inactiveUsers: number;
    regions: number;
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
  displayName: "Super Admin",
  stats: {
    totalAdmins: 0,
    totalDoctors: 0,
    totalMidwives: 0,
    totalMothers: 0,
    highRiskMothers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    regions: 0,
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

export default function SuperAdminDashboard() {
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

        const response = await fetch("/api/superadmin/dashboard", { cache: "no-store" });
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
        id: "admins",
        label: "Regional Admins",
        count: dashboard.stats.totalAdmins,
        tone: "moderate",
        share: `${dashboard.stats.regions} regions covered`,
      },
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
        tone: "high",
        share: `${formatShare(dashboard.stats.totalMidwives, totalMothers)} field coverage`,
      },
    ] as const;

    return { careSummary };
  }, [dashboard]);

  return (
    <div className="midwife-dashboard doctor-dashboard-page superadmin-dashboard-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>System Dashboard</h1>
          <p>
            Monitor platform users, maternal risk distribution, regional coverage, and recent operational activity.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading superadmin dashboard..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="midwife-top-grid">
            <div className="dashboard-card mothers-card">
              <h3>Platform Coverage</h3>

              <div className="care-modern-wrap">
                <div className="care-total-card">
                  <div>
                    <p>Total Mothers Registered</p>
                    <h2>{formatCount(dashboard.stats.totalMothers)}</h2>
                    <span className="care-total-chip">
                      {formatCount(dashboard.stats.highRiskMothers)} high-risk mothers
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
                        {item.id === "midwives" ? <AlertTriangle size={14} /> : null}
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
                  <h3 className="checkup-title">System Overview</h3>
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
                      <BarChart data={dashboard.weeklyEpds} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
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
                <h3>Overall Risk Distribution</h3>
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
                <h3>Recent Admin Activity</h3>
              </div>

              <button className="btn-primary" onClick={() => router.push("/superadmin/audit-logs")}>
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
                  <p>Platform changes will appear here once audit logs are created.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
