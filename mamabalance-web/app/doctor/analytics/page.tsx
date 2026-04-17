"use client";

import { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { DownloadCloud, Activity, CalendarDays, Users, AlertTriangle, ChevronDown } from "lucide-react";
import LoadingState from "@/components/admin/LoadingState";
import ModalWrapper from "@/app/superadmin/educational-content/modals/ModalWrapper";
import "@/app/doctor/styles/DoctorAnalytics.css";
import "@/app/superadmin/styles/analyticsReports.css";

type ReportType = "full" | "risk" | "observations" | "checkups" | "mothers";

type MotherOption = {
  uid: string;
  motherName: string;
  riskLevel: string;
};

type CheckupItem = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: string;
  date: string;
  time: string;
  status: string;
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

export default function AnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>("full");

  const [mothersBase, setMothersBase] = useState<MotherOption[]>([]);
  const [checkupsBase, setCheckupsBase] = useState<CheckupItem[]>([]);
  const [observationsBase, setObservationsBase] = useState<ObservationRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const [checkupsRes, obsRes] = await Promise.all([
          fetch("/api/doctor/checkups", { cache: "no-store" }),
          fetch("/api/doctor/observations", { cache: "no-store" }),
        ]);

        const [checkupsData, obsData] = await Promise.all([
          checkupsRes.json(),
          obsRes.json(),
        ]);

        if (!mounted) return;
        setMothersBase(checkupsData.mothers || []);
        setCheckupsBase(checkupsData.checkups || []);
        setObservationsBase(obsData.observations || []);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  // Dynamic calculations based on live DB data
  const { stats, obsData, checkupForecast, riskData } = useMemo(() => {
    const boundaryDate = new Date();
    if (timeFilter === "This Week") boundaryDate.setDate(boundaryDate.getDate() - 7);
    else if (timeFilter === "This Month") boundaryDate.setMonth(boundaryDate.getMonth() - 1);
    else if (timeFilter === "This Year") boundaryDate.setFullYear(boundaryDate.getFullYear() - 1);

    // 1. RISK PIE
    let low = 0, mod = 0, high = 0;
    mothersBase.forEach(m => {
      const r = m.riskLevel?.toLowerCase();
      if (r === "high") high++;
      else if (r === "moderate") mod++;
      else low++;
    });

    const riskDataPayload = [
      { name: "Low", value: low, color: "#22c55e" },
      { name: "Moderate", value: mod, color: "#fb923c" },
      { name: "High", value: high, color: "#dc2626" },
    ];

    // 2. OBSERVATIONS BAR CHART
    const relevantObs = observationsBase.filter(o => new Date(o.observedAt) >= boundaryDate);
    const groupedObs: Record<string, number> = {};
    let formattedObs: { month: string, value: number }[] = [];

    if (timeFilter === "This Year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      months.forEach(m => groupedObs[m] = 0);
      relevantObs.forEach(o => {
        const key = new Date(o.observedAt).toLocaleString('en-US', { month: 'short' });
        if (groupedObs[key] !== undefined) groupedObs[key]++;
      });
      formattedObs = months.map(m => ({ month: m, value: groupedObs[m] }));
    } else if (timeFilter === "This Month") {
      ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].forEach(w => groupedObs[w] = 0);
      relevantObs.forEach(o => {
        const w = `Week ${Math.ceil(new Date(o.observedAt).getDate() / 7)}`;
        if (groupedObs[w] !== undefined) groupedObs[w]++;
      });
      formattedObs = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(w => ({ month: w, value: groupedObs[w] }));
    } else {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.forEach(d => groupedObs[d] = 0);
      relevantObs.forEach(o => {
        const key = new Date(o.observedAt).toLocaleString('en-US', { weekday: 'short' });
        if (groupedObs[key] !== undefined) groupedObs[key]++;
      });
      formattedObs = days.map(d => ({ month: d, value: groupedObs[d] }));
    }

    // 3. CHECKUP FORECAST
    const futureCheckups = checkupsBase.filter(c => new Date(`${c.date}T${c.time}`) >= new Date());
    const groupedForecast: Record<string, number> = {};
    let formattedForecast: { day: string, count: number }[] = [];

    if (timeFilter === "This Year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      months.forEach(m => groupedForecast[m] = 0);
      futureCheckups.forEach(c => {
        const key = new Date(c.date).toLocaleString('en-US', { month: 'short' });
        if (groupedForecast[key] !== undefined) groupedForecast[key]++;
      });
      formattedForecast = months.map(m => ({ day: m, count: groupedForecast[m] }));
    } else {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.forEach(d => groupedForecast[d] = 0);
      futureCheckups.forEach(c => {
        const key = new Date(c.date).toLocaleString('en-US', { weekday: 'short' });
        if (groupedForecast[key] !== undefined) groupedForecast[key]++;
      });
      formattedForecast = days.map(d => ({ day: d, count: groupedForecast[d] }));
    }

    return {
      stats: {
        totalMothers: mothersBase.length,
        highRisk: high,
        upcomingCheckups: futureCheckups.length,
        observations: relevantObs.length,
        criticalMothers: mothersBase
          .filter(m => m.riskLevel?.toLowerCase() === "high")
          .map(m => {
            const latestObs = observationsBase
              .filter(o => o.motherUid === m.uid)
              .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())[0];
            return {
              ...m,
              lastMood: latestObs?.mood || "N/A",
              lastSleep: latestObs?.sleep || "N/A",
              lastObsDate: latestObs?.timestamp || "No Data"
            };
          }),
        sourceDetails: {
          doctor: relevantObs.filter(o => o.source === "doctor").length,
          midwifeHome: relevantObs.filter(o => o.source === "homeVisit").length,
          midwifeClinic: relevantObs.filter(o => o.source === "clinicVisit").length,
        }
      },
      riskData: riskDataPayload,
      obsData: formattedObs,
      checkupForecast: formattedForecast,
    };
  }, [timeFilter, mothersBase, checkupsBase, observationsBase]);

  function reportTitle(reportType: ReportType) {
    switch (reportType) {
      case "risk":
        return "Maternal Health Risk Distribution Analysis";
      case "observations":
        return "Clinical Observation & Vitality Monitoring Register";
      case "checkups":
        return "Medical Appointment Forecast & Capacity Matrix";
      case "mothers":
        return "Doctor-Assigned Maternal Clinical Registry";
      default:
        return "Comprehensive Maternal Health & Clinical Analytics Summary";
    }
  }

  const MAMA_TEAL = "#499d85";
  const MAMA_RED = "#dc2626";
  const MAMA_ORANGE = "#fb923c";
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
    pdf.text("Doctor Analytics Reports", 14, 24);

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

    drawKPIBox(pdf, "Mothers", stats.totalMothers, 14, startY, boxW, boxH, [73, 157, 133]);
    drawKPIBox(pdf, "High Risk", stats.highRisk, 14 + boxW + gap, startY, boxW, boxH, [220, 38, 38]);
    drawKPIBox(pdf, "Checkups", stats.upcomingCheckups, 14 + (boxW + gap) * 2, startY, boxW, boxH, [34, 197, 94]);
    drawKPIBox(pdf, "Recent Obs", stats.observations, 14 + (boxW + gap) * 3, startY, boxW, boxH, [59, 130, 246]);
  }

  function addCareInsights(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Care Channel Utilization & Delivery Insight", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Observation Channel", "Volume", "Strategic Significance"]],
      body: [
        ["Doctor Clinic Entries", stats.sourceDetails.doctor, "High-fidelity medical documentation"],
        ["Midwife Home Visits", stats.sourceDetails.midwifeHome, "Community-level maternal monitoring"],
        ["Midwife Clinic Visits", stats.sourceDetails.midwifeClinic, "Routine regional checkup activity"],
      ],
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addCriticalPatients(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Clinical Alert: Patient Watchlist for Immediate Review", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["High Risk Mother", "Last Obs Date", "Mood", "Sleep"]],
      body: stats.criticalMothers.length > 0
        ? stats.criticalMothers.map(m => [m.motherName, m.lastObsDate, m.lastMood, m.lastSleep])
        : [["No high-risk patients identified in current scope", "-", "-", "-"]],
      headStyles: { fillColor: [220, 38, 38], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: "bold" }
      }
    });
  }

  function addClinicalObservations(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Clinical Observation & Vitality Monitoring Register", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Date", "Mother", "Risk", "Mood", "Sleep", "Appetite", "By"]],
      body: observationsBase.slice(0, 15).map(o => [
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

  function addRisk(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Maternal Health Risk Distribution Analysis", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Risk Level", "Mother Count", "Distribution"]],
      body: riskData.map((item) => {
        const percentage = stats.totalMothers > 0
          ? ((item.value / stats.totalMothers) * 100).toFixed(1)
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

  function addCheckups(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Medical Appointment Forecast & Capacity Matrix", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Period", "Forecast Checkups"]],
      body: checkupForecast.map((item) => [item.day, item.count]),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addMothers(pdf: jsPDF, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Doctor-Assigned Maternal Clinical Registry", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["ID", "Mother Name", "Risk", "Last Status", "Next Checkup"]],
      body: mothersBase.map((mother) => {
        const motherObs = observationsBase
          .filter((o) => o.motherUid === mother.uid)
          .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())[0];
        const motherCheckups = checkupsBase
          .filter((c) => c.motherUid === mother.uid && new Date(`${c.date}T${c.time}`) >= new Date())
          .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

        return [
          mother.uid.substring(0, 8) + "...",
          mother.motherName,
          mother.riskLevel.toUpperCase(),
          motherObs ? `${motherObs.mood} (${motherObs.timestamp.split(",")[0]})` : "No Record",
          motherCheckups[0] ? `${motherCheckups[0].date} ${motherCheckups[0].time}` : "Unscheduled",
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
        addHeader(pdf, "Clinical Alert: Patient Watchlist for Immediate Review");
        addCriticalPatients(pdf);
        pdf.addPage();
        addHeader(pdf, "Clinical Observation & Vitality Monitoring Register");
        addClinicalObservations(pdf);
        pdf.addPage();
        addHeader(pdf, "Care Channel Utilization & Delivery Insight");
        addCareInsights(pdf);
        pdf.addPage();
        addHeader(pdf, "Maternal Health Risk Distribution Analysis");
        addRisk(pdf);
        pdf.addPage();
        addHeader(pdf, "Medical Appointment Forecast & Capacity Matrix");
        addCheckups(pdf);
        pdf.addPage();
        addHeader(pdf, "Doctor-Assigned Maternal Clinical Registry");
        addMothers(pdf);
      } else if (selectedReport === "risk") {
        addRisk(pdf, 48);
      } else if (selectedReport === "observations") {
        addClinicalObservations(pdf, 48);
      } else if (selectedReport === "checkups") {
        addCheckups(pdf, 48);
      } else {
        addMothers(pdf, 48);
      }

      addFooter(pdf);
      pdf.save(`doctor_${selectedReport}_report_${timeFilter.replace(/\s+/g, "_").toLowerCase()}.pdf`);
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="analytics-page">

      {/* HEADER */}
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Analytics & Insights</h1>
          <p>Track maternal health performance, risk distribution, observation activity, and checkup demand.</p>
        </div>

        <div className="doctor-page-header-actions analytics-actions">
          <div className="analytics-filter">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
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

          <button
            className="export-btn"
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
          >
            <DownloadCloud size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading analytics and insights..." />
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="stats-grid">
            <div className="stat-card teal">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-info">
                <p>Monitored Mothers</p>
                <h2>{stats.totalMothers}</h2>
              </div>
            </div>

            <div className="stat-card red">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <p>High-Risk Alerts</p>
                <h2>{stats.highRisk}</h2>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon"><CalendarDays size={24} /></div>
              <div className="stat-info">
                <p>Upcoming Checkups</p>
                <h2>{stats.upcomingCheckups}</h2>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon"><Activity size={24} /></div>
              <div className="stat-info">
                <p>Recent Observations</p>
                <h2>{stats.observations}</h2>
              </div>
            </div>
          </div>

          {/* CHART GRID */}
          <div className="charts-grid top-charts">
            {/* EPDS DISTRIBUTION */}
            <div className="chart-card">
              <h3>EPDS Risk Level Distribution</h3>
              <p className="chart-subtitle">Breakdown of assigned mothers by current risk profile</p>
              <div className="risk-chart-wrap">
                <ResponsiveContainer width={240} height={240}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      innerRadius={70}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {riskData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="risk-summary">
                  {riskData.map((item) => (
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
            </div>

            {/* OBSERVATION FREQUENCY */}
            <div className="chart-card">
              <h3>Symptom Tracking Velocity</h3>
              <p className="chart-subtitle">Observation entries logged over time</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={obsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} />
                  <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "12px", border: "none" }} />
                  <Bar dataKey="value" fill="#499d85" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BOTTOM SPANNING CHART */}
          <div className="charts-grid bottom-charts">
            <div className="chart-card full-width">
              <h3>Checkup Utilization Forecast</h3>
              <p className="chart-subtitle">Anticipated clinic appointments mapped across operational days</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={checkupForecast} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCheckup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCheckup)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </>
      )}

      {showExportModal ? (
        <ModalWrapper variant="export" onClose={() => setShowExportModal(false)}>
          <div className="analytics-export-modal">
            <div className="analytics-export-header">
              <span className="analytics-export-eyebrow">PDF Export</span>
              <h2 className="modal-title">Export Doctor Report</h2>
              <p>Choose one analytics report and export it as a PDF.</p>
            </div>

            <div className="analytics-export-fields">
              <div className="analytics-export-field">
                <label htmlFor="doctor-report-type">Report Type</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="doctor-report-type"
                    className="analytics-select"
                    value={selectedReport}
                    onChange={(event) => setSelectedReport(event.target.value as ReportType)}
                  >
                    <option value="full">Full Doctor Analytics Report</option>
                    <option value="risk">EPDS Risk Distribution Report</option>
                    <option value="observations">Observation Activity Report</option>
                    <option value="checkups">Checkup Forecast Report</option>
                    <option value="mothers">Assigned Mothers Report</option>
                  </select>
                  <ChevronDown className="filter-select-icon teal" size={18} />
                </div>
              </div>

              <div className="analytics-export-field">
                <label htmlFor="doctor-report-range">Date Range</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="doctor-report-range"
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
              <button className="btn-close" onClick={() => setShowExportModal(false)}>
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
