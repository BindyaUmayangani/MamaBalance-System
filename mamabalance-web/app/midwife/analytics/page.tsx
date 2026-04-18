"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Activity, AlertTriangle, CalendarDays, ChevronDown, DownloadCloud, Users } from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import ModalWrapper from "@/app/superadmin/educational-content/modals/ModalWrapper";
import type { MidwifeMotherRecord } from "@/lib/midwife/types";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";
import "@/app/doctor/styles/DoctorAnalytics.css";
import "@/app/superadmin/styles/analyticsReports.css";

type ReportType = "full" | "risk" | "observations" | "visits" | "mothers";

type VisitItem = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: "Low" | "Moderate" | "High";
  visitType: "home" | "clinic";
  date: string;
  time: string;
  notes: string;
  status: "Overdue" | "Upcoming" | "Rescheduled" | "Completed";
};

type ObservationRecord = {
  id: string;
  source: "doctor" | "homeVisit" | "clinicVisit";
  motherUid: string;
  motherName: string;
  observedAt: string;
  timestamp: string;
  riskLevel: string;
  mood: string;
  sleep: string;
  appetite: string;
  note: string;
  observedBy: string;
};

function parseDateValue(value: string | null | undefined) {
  if (!value || value === "-") return null;

  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function resolveVisitDate(visit: VisitItem) {
  return parseDateValue(`${visit.date}T${visit.time}`);
}

function buildTimeLabels(timeFilter: string) {
  if (timeFilter === "This Year") {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  }

  if (timeFilter === "This Month") {
    return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  }

  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

function getTimeKey(date: Date, timeFilter: string) {
  if (timeFilter === "This Year") {
    return date.toLocaleString("en-US", { month: "short" });
  }

  if (timeFilter === "This Month") {
    return `Week ${Math.ceil(date.getDate() / 7)}`;
  }

  return date.toLocaleString("en-US", { weekday: "short" });
}

export default function MidwifeAnalyticsPage() {
  const MAMA_TEAL = "#499d85";
  const MAMA_RED = "#dc2626";
  const MAMA_ORANGE = "#fb923c";

  const [timeFilter, setTimeFilter] = useState("This Month");
  const [isExporting, setIsExporting] = useState(false);
  const [mothers, setMothers] = useState<MidwifeMotherRecord[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>("full");

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        setIsLoading(true);
        setError("");

        const [mothersResponse, visitsResponse, observationsResponse] = await Promise.all([
          fetch("/api/midwife/mothers?scope=assigned", { cache: "no-store" }),
          fetch("/api/midwife/visits", { cache: "no-store" }),
          fetch("/api/midwife/observations", { cache: "no-store" }),
        ]);

        const mothersPayload = (await mothersResponse.json()) as {
          mothers?: MidwifeMotherRecord[];
          error?: string;
        };
        const visitsPayload = (await visitsResponse.json()) as {
          visits?: VisitItem[];
          error?: string;
        };
        const observationsPayload = (await observationsResponse.json()) as {
          observations?: ObservationRecord[];
          error?: string;
        };

        if (!mothersResponse.ok) {
          throw new Error(mothersPayload.error || "Unable to load assigned mothers.");
        }

        if (!visitsResponse.ok) {
          throw new Error(visitsPayload.error || "Unable to load visits.");
        }

        if (!observationsResponse.ok) {
          throw new Error(observationsPayload.error || "Unable to load observations.");
        }

        if (isMounted) {
          setMothers(mothersPayload.mothers || []);
          setVisits(visitsPayload.visits || []);
          setObservations(observationsPayload.observations || []);
        }
      } catch (caughtError) {
        if (isMounted) {
          setMothers([]);
          setVisits([]);
          setObservations([]);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load analytics.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const boundaryDate = new Date();
    if (timeFilter === "This Week") boundaryDate.setDate(boundaryDate.getDate() - 7);
    else if (timeFilter === "This Month") boundaryDate.setMonth(boundaryDate.getMonth() - 1);
    else if (timeFilter === "This Year") boundaryDate.setFullYear(boundaryDate.getFullYear() - 1);

    const lowRisk = mothers.filter((m) => m.risk?.toLowerCase() === "low").length;
    const moderateRisk = mothers.filter((m) => m.risk?.toLowerCase() === "moderate").length;
    const highRisk = mothers.filter((m) => m.risk?.toLowerCase() === "high").length;

    const counts = { low: lowRisk, mod: moderateRisk, high: highRisk };

    const upcomingVisitsList = visits.filter((visit) => {
      const visitDate = resolveVisitDate(visit);
      return Boolean(visitDate && visitDate >= now && visit.status !== "Completed");
    });

    const relevantObs = observations.filter((observation) => {
      const observedAt = parseDateValue(observation.observedAt);
      return Boolean(observedAt && observedAt >= boundaryDate);
    });

    const groupedObservations: Record<string, number> = {};
    buildTimeLabels(timeFilter).forEach((label) => {
      groupedObservations[label] = 0;
    });

    relevantObs.forEach((observation) => {
      const observedAt = parseDateValue(observation.observedAt);
      if (!observedAt) return;

      const key = getTimeKey(observedAt, timeFilter);
      if (groupedObservations[key] !== undefined) {
        groupedObservations[key] += 1;
      }
    });

    const observationVelocity = buildTimeLabels(timeFilter).map((label) => ({
      month: label,
      value: groupedObservations[label],
    }));

    const groupedForecast: Record<string, number> = {};
    const forecastLabels = timeFilter === "This Year"
      ? buildTimeLabels("This Year")
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    forecastLabels.forEach((label) => {
      groupedForecast[label] = 0;
    });

    upcomingVisitsList.forEach((visit) => {
      const visitDate = resolveVisitDate(visit);
      if (!visitDate) return;

      const key =
        timeFilter === "This Year"
          ? visitDate.toLocaleString("en-US", { month: "short" })
          : visitDate.toLocaleString("en-US", { weekday: "short" });
      if (groupedForecast[key] !== undefined) {
        groupedForecast[key] += 1;
      }
    });

    return {
      stats: {
        totalMothers: mothers.length,
        highRisk: counts.high,
        moderateRisk: counts.mod,
        lowRisk: counts.low,
        upcomingVisits: upcomingVisitsList.length,
        observations: relevantObs.length,
        criticalPatients: mothers
          .filter(m => m.risk?.toLowerCase() === "high")
          .map(m => {
            const latestObs = observations
              .filter(o => o.motherUid === m.userId)
              .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())[0];
            return {
              ...m,
              lastMood: latestObs?.mood || "N/A",
              lastSleep: latestObs?.sleep || "N/A",
              lastObsDate: latestObs?.timestamp || "No Data"
            };
          }),
        sourceDetails: {
          home: relevantObs.filter(o => o.source === "homeVisit").length,
          clinic: relevantObs.filter(o => o.source === "clinicVisit").length,
          doctor: relevantObs.filter(o => o.source === "doctor").length,
        }
      },
      riskData: [
        { name: "High", value: counts.high, color: MAMA_RED },
        { name: "Moderate", value: counts.mod, color: MAMA_ORANGE },
        { name: "Low", value: counts.low, color: MAMA_TEAL },
      ],
      observationVelocity,
      visitForecast: forecastLabels.map((label) => ({
        day: label,
        count: groupedForecast[label],
      })),
    };
  }, [mothers, observations, timeFilter, visits]);

  function reportTitle(reportType: ReportType) {
    switch (reportType) {
      case "risk":
        return "Maternal Health Population Risk Analysis";
      case "observations":
        return "Clinical Observation & Vitality Monitoring Register";
      case "visits":
        return "Midwife Field Visit Forecast Matrix";
      case "mothers":
        return "Midwife-Assigned Maternal Clinical Registry";
      default:
        return "Comprehensive Midwife Care & Analytics Summary";
    }
  }

  const MAMA_GREEN = "#22c55e";

  function addHeader(pdf: jsPDF, title: string) {
    // Brand Background Bar
    pdf.setFillColor(MAMA_TEAL);
    pdf.rect(0, 0, pdf.internal.pageSize.width, 40, "F");

    // Header Content
    pdf.setTextColor("#ffffff");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("MamaBalance", 14, 16);

    pdf.setFontSize(13);
    pdf.text("Midwife Analytics Reports", 14, 24);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(title, 14, 31);

    // Metadata Right-aligned
    pdf.setFontSize(9);
    const dateStr = new Date().toLocaleString("en-LK");
    const pageWidth = pdf.internal.pageSize.width;
    pdf.text(`Generated: ${dateStr}`, pageWidth - 14, 15, { align: "right" });
    pdf.text(`Timeframe: ${timeFilter}`, pageWidth - 14, 22, { align: "right" });
  }

  function addFooter(pdf: jsPDF) {
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(14, pdf.internal.pageSize.height - 20, pdf.internal.pageSize.width - 14, pdf.internal.pageSize.height - 20);

      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text("Confidential - For Medical & Administrative Use Only", 14, pdf.internal.pageSize.height - 12);
      pdf.text(`Page ${page} of ${pageCount}`, pdf.internal.pageSize.width - 36, pdf.internal.pageSize.height - 12);
    }
  }

  function drawKPIBox(pdf: jsPDF, label: string, value: string | number, x: number, y: number, w: number, h: number, color: [number, number, number]) {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(0.1);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(x, y, w, h, 3, 3, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(label.toUpperCase(), x + 5, y + 8);

    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(value.toString(), x + 5, y + 20);
  }

  function addSummaryBoxes(pdf: jsPDF, startY = 48) {
    const boxW = 45;
    const boxH = 24;
    const gap = 3;

    drawKPIBox(pdf, "Mothers", analyticsData.stats.totalMothers, 14, startY, boxW, boxH, [73, 157, 133]);
    drawKPIBox(pdf, "High Risk", analyticsData.stats.highRisk, 14 + boxW + gap, startY, boxW, boxH, [220, 38, 38]);
    drawKPIBox(pdf, "Visits", analyticsData.stats.upcomingVisits, 14 + (boxW + gap) * 2, startY, boxW, boxH, [34, 197, 94]);
    drawKPIBox(pdf, "Recent Obs", analyticsData.stats.observations, 14 + (boxW + gap) * 3, startY, boxW, boxH, [59, 130, 246]);
  }

  function addSummary(pdf: jsPDF, startY = 54) {
    autoTable(pdf, {
      startY,
      head: [["Metric", "Value"]],
      body: [
        ["Monitored Mothers", analyticsData.stats.totalMothers],
        ["High-Risk Alerts", analyticsData.stats.highRisk],
        ["Upcoming Visits", analyticsData.stats.upcomingVisits],
        ["Recent Observations", analyticsData.stats.observations],
      ],
    });
  }

  function addRisk(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Maternal EPDS Risk Distribution Analysis", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Risk Level", "Mother Count", "Distribution"]],
      body: analyticsData.riskData.map((item) => {
        const percentage = analyticsData.stats.totalMothers > 0
          ? ((item.value / analyticsData.stats.totalMothers) * 100).toFixed(1)
          : "0.0";
        return [`${item.name} Risk`, item.value, `${percentage}%`];
      }),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          if (data.cell.text[0].includes("High")) data.cell.styles.textColor = [220, 38, 38];
          if (data.cell.text[0].includes("Moderate")) data.cell.styles.textColor = [251, 146, 60];
          if (data.cell.text[0].includes("Low")) data.cell.styles.textColor = [34, 197, 94];
        }
      }
    });
  }

  function addChannelInsights(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Care Delivery Channel & Monitoring Insights", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Monitoring Channel", "Observation Volume", "Clinical Significance"]],
      body: [
        ["Midwife Home Visits", analyticsData.stats.sourceDetails.home, "Primary community monitoring activity"],
        ["Medical Clinic Visits", analyticsData.stats.sourceDetails.clinic, "Regional facility-based checkups"],
        ["Doctor Consultations", analyticsData.stats.sourceDetails.doctor, "Physician-led clinical interventions"],
      ],
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addCriticalWatchlist(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Clinical Alert: Priority Watchlist for Immediate Review", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["High Risk Mother", "Last Obs Date", "Latest Mood", "Latest Sleep"]],
      body: analyticsData.stats.criticalPatients.length > 0
        ? analyticsData.stats.criticalPatients.map(m => [m.fullName || "Unknown", m.lastObsDate, m.lastMood, m.lastSleep])
        : [["No high-risk patients identified in current scope", "-", "-", "-"]],
      headStyles: { fillColor: [220, 38, 38], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: "bold" } }
    });
  }

  function addObservations(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Clinical Observation & Vitality Monitoring Register", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Date", "Mother", "Risk", "Mood", "Sleep", "Appetite", "By"]],
      body: observations.slice(0, 15).map(o => [
        o.timestamp.split(",")[0],
        o.motherName,
        o.riskLevel.toUpperCase(),
        o.mood,
        o.sleep,
        o.appetite,
        o.observedBy.replace("Midwife ", "MW: ").replace("Dr. ", "DR: ")
      ]),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 8.5, cellPadding: 3 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          if (data.cell.text[0] === "HIGH") data.cell.styles.textColor = [220, 38, 38];
          if (data.cell.text[0] === "MODERATE") data.cell.styles.textColor = [251, 146, 60];
        }
      }
    });
  }

  function addVisits(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Midwife Field Visit Forecast Matrix", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Period", "Forecast Visits"]],
      body: analyticsData.visitForecast.map((item) => [item.day, item.count]),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addMothers(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Midwife-Assigned Maternal Clinical Register", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["ID", "Mother Name", "Risk", "Last EPDS", "Next Visit"]],
      body: mothers.map((mother) => {
        const nextVisit = visits
          .filter((visit) => visit.motherUid === mother.uid && resolveVisitDate(visit) && resolveVisitDate(visit)! >= new Date())
          .sort((left, right) =>
            (resolveVisitDate(left)?.getTime() ?? 0) - (resolveVisitDate(right)?.getTime() ?? 0),
          )[0];

        return [
          mother.userId.substring(0, 8) + "...",
          mother.name,
          mother.risk.toUpperCase(),
          mother.lastEPDS || "-",
          nextVisit ? `${nextVisit.date} ${nextVisit.time}` : "Unscheduled",
        ];
      }),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        1: { fontStyle: "bold" },
      }
    });
  }

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF();
      addHeader(pdf, reportTitle(selectedReport));

      if (selectedReport === "full") {
        addSummaryBoxes(pdf);
        pdf.addPage();
        addHeader(pdf, "Clinical Alert: Priority Watchlist for Immediate Review");
        addCriticalWatchlist(pdf);
        pdf.addPage();
        addHeader(pdf, "Clinical Observation & Vitality Monitoring Register");
        addObservations(pdf);
        pdf.addPage();
        addHeader(pdf, "Care Delivery Channel & Monitoring Insights");
        addChannelInsights(pdf);
        pdf.addPage();
        addHeader(pdf, "Maternal Health Population Risk Analysis");
        addRisk(pdf);
        pdf.addPage();
        addHeader(pdf, "Midwife Field Visit Forecast Matrix");
        addVisits(pdf);
        pdf.addPage();
        addHeader(pdf, "Midwife-Assigned Maternal Clinical Registry");
        addMothers(pdf);
      } else if (selectedReport === "risk") {
        addRisk(pdf, 48);
      } else if (selectedReport === "observations") {
        addObservations(pdf, 48);
      } else if (selectedReport === "visits") {
        addVisits(pdf, 48);
      } else {
        addMothers(pdf, 48);
      }

      addFooter(pdf);
      pdf.save(`midwife_${selectedReport}_report_${timeFilter.replace(/\s+/g, "_").toLowerCase()}.pdf`);
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="analytics-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Analytics & Insights</h1>
          <p>Track maternal health performance, risk distribution, observation activity, and visit demand.</p>
        </div>

        <div className="doctor-page-header-actions analytics-actions">
          <div className="analytics-filter">
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              className="analytics-select"
            >
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
            <span className="filter-select-icon" aria-hidden="true">
              <ChevronDown size={18} strokeWidth={2.4} />
            </span>
          </div>

          <button className="export-btn" onClick={() => setShowExportModal(true)} disabled={isExporting}>
            <DownloadCloud size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading midwife analytics..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card teal">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-info">
                <p>Monitored Mothers</p>
                <h2>{analyticsData.stats.totalMothers}</h2>
              </div>
            </div>

            <div className="stat-card red">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <p>High-Risk Alerts</p>
                <h2>{analyticsData.stats.highRisk}</h2>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon"><CalendarDays size={24} /></div>
              <div className="stat-info">
                <p>Upcoming Visits</p>
                <h2>{analyticsData.stats.upcomingVisits}</h2>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon"><Activity size={24} /></div>
              <div className="stat-info">
                <p>Recent Observations</p>
                <h2>{analyticsData.stats.observations}</h2>
              </div>
            </div>
          </div>

          <div className="charts-grid top-charts">
            <section className="chart-card">
              <h3>EPDS Risk Level Distribution</h3>
              <p className="chart-subtitle">Breakdown of assigned mothers by current risk profile</p>
              <div className="risk-chart-wrap">
                <ResponsiveContainer width={240} height={240}>
                  <PieChart>
                    <Pie
                      data={analyticsData.riskData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {analyticsData.riskData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="risk-summary">
                  {analyticsData.riskData.map((item) => (
                    <div key={item.name} className="risk-row">
                      <span className="risk-name">
                        <span className="risk-dot" style={{ backgroundColor: item.color }} />
                        {item.name} Risk
                      </span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="chart-card">
              <h3>Symptom Tracking Velocity</h3>
              <p className="chart-subtitle">Observation entries logged over time</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analyticsData.observationVelocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} />
                  <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "12px", border: "none" }} />
                  <Bar dataKey="value" fill="#499d85" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          <div className="charts-grid bottom-charts">
            <section className="chart-card full-width">
              <h3>Visit Utilization Forecast</h3>
              <p className="chart-subtitle">Anticipated home and clinic visits mapped across operational days</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={analyticsData.visitForecast} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisit)" />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}

      {showExportModal ? (
        <ModalWrapper variant="export" onClose={() => setShowExportModal(false)}>
          <div className="analytics-export-modal">
            <div className="analytics-export-header">
              <span className="analytics-export-eyebrow">PDF Export</span>
              <h2 className="modal-title">Export Midwife Report</h2>
              <p>Choose one analytics report and export it as a PDF.</p>
            </div>

            <div className="analytics-export-fields">
              <div className="analytics-export-field">
                <label htmlFor="midwife-report-type">Report Type</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="midwife-report-type"
                    className="analytics-select"
                    value={selectedReport}
                    onChange={(event) => setSelectedReport(event.target.value as ReportType)}
                  >
                    <option value="full">Full Midwife Analytics Report</option>
                    <option value="risk">EPDS Risk Distribution Report</option>
                    <option value="observations">Observation Activity Report</option>
                    <option value="visits">Visit Forecast Report</option>
                    <option value="mothers">Assigned Mothers Report</option>
                  </select>
                  <ChevronDown className="filter-select-icon teal" size={18} />
                </div>
              </div>

              <div className="analytics-export-field">
                <label htmlFor="midwife-report-range">Date Range</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="midwife-report-range"
                    className="analytics-select"
                    value={timeFilter}
                    onChange={(event) => setTimeFilter(event.target.value)}
                  >
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="This Year">This Year</option>
                  </select>
                  <ChevronDown className="filter-select-icon teal" size={18} />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleExport} disabled={isExporting}>
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </ModalWrapper>
      ) : null}
    </div>
  );
}
