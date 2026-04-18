"use client";

import { useState, useEffect } from "react";
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
  CartesianGrid,
} from "recharts";
import {
  DownloadCloud,
  Users,
  AlertTriangle,
  ChevronDown,
  Stethoscope,
  Activity
} from "lucide-react";
import LoadingState from "@/components/admin/LoadingState";
import ModalWrapper from "../educational-content/modals/ModalWrapper";
import "@/app/superadmin/styles/analyticsReports.css";

type ReportType = "full" | "risk" | "activity" | "regions";

type RegionalData = {
  name: string;
  totalMothers: number;
  low: number;
  moderate: number;
  high: number;
  submissions: number;
};

type AnalyticsData = {
  stats: {
    totalMothers: number;
    highRiskMothers: number;
    totalDoctors: number;
    totalMidwives: number;
  };
  riskDistribution: { name: string; value: number; color: string }[];
  epdsTrend: { label: string; value: number }[];
  obsTrend: { label: string; value: number }[];
  regionalBreakdown: RegionalData[];
};

export default function AnalyticsReportsPage() {
  const [timeFilter, setTimeFilter] = useState("Month");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [regionalPage, setRegionalPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>("full");
  const regionalPageSize = 5;
  const [activeActivityChart, setActiveActivityChart] = useState<"epds" | "obs">("epds");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const filterParam = timeFilter.toLowerCase();
        const res = await fetch(`/api/superadmin/analytics?filter=${filterParam}`, { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch superadmin analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [timeFilter]);

  function reportTitle(reportType: ReportType) {
    switch (reportType) {
      case "risk":
        return "System EPDS Risk Distribution Report";
      case "activity":
        return "System Activity Velocity Report";
      case "regions":
        return "Regional Performance Report";
      default:
        return "System Analytics Report";
    }
  }

  const MAMA_TEAL = "#499d85";
  const MAMA_RED = "#dc2626";
  const MAMA_ORANGE = "#fb923c";
  const MAMA_GREEN = "#22c55e";

  function reportTitle(reportType: ReportType) {
    switch (reportType) {
      case "risk": return "System EPDS Risk Distribution Analysis";
      case "activity": return "System Engagement & Activity Matrix";
      case "regions": return "Regional Performance Benchmarks";
      default: return "Full System Executive Analytics Insights";
    }
  }

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
    pdf.text("System Analytics Reports", 14, 24);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(title, 14, 31);

    // Metadata Right-aligned
    pdf.setFontSize(9);
    const dateStr = new Date().toLocaleString("en-LK");
    const pageWidth = pdf.internal.pageSize.width;
    pdf.text(`Generated: ${dateStr}`, pageWidth - 14, 15, { align: "right" });
    pdf.text(`Timeframe: ${timeFilter}`, pageWidth - 14, 22, { align: "right" });
    pdf.text(`Level: Super Admin (System-Wide)`, pageWidth - 14, 29, { align: "right" });

    // Reset for content
    pdf.setTextColor("#333333");
  }

  function addFooter(pdf: jsPDF) {
    const pageCount = pdf.getNumberOfPages();
    const height = pdf.internal.pageSize.height;
    const width = pdf.internal.pageSize.width;

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);

      // Horizontal Line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(14, height - 20, width - 14, height - 20);

      pdf.setFontSize(8);
      pdf.setTextColor("#666666");
      pdf.text("MamaBalance - Maternal Mental Health Data Network", 14, height - 12);
      pdf.text("Strictly Confidential - Authorized Access Only", 14, height - 8);

      pdf.setFont("helvetica", "bold");
      pdf.text(`PAGE ${page} OF ${pageCount}`, width - 14, height - 12, { align: "right" });
    }
  }

  function drawKPIBox(pdf: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: string) {
    // Shadow effect
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(x + 1, y + 1, w, h, 3, 3, "F");

    // Main Box
    pdf.setFillColor("#ffffff");
    pdf.setDrawColor(230, 230, 230);
    pdf.roundedRect(x, y, w, h, 3, 3, "FD");

    // Color bar
    pdf.setFillColor(color);
    pdf.rect(x + 2, y + 5, 3, h - 10, "F");

    // Text
    pdf.setTextColor("#666666");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x + 10, y + 15);

    pdf.setTextColor("#1a1a1a");
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, x + 10, y + 30);
  }

  function addSummary(pdf: jsPDF, analytics: AnalyticsData, startY = 55) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Executive Summary - High Level KPIs", 14, startY);

    const boxW = (pdf.internal.pageSize.width - 48) / 4;
    const boxH = 40;
    const boxY = startY + 8;

    drawKPIBox(pdf, 14, boxY, boxW, boxH, "Total Mothers", analytics.stats.totalMothers.toString(), MAMA_TEAL);
    drawKPIBox(pdf, 14 + boxW + 6, boxY, boxW, boxH, "High Risk", analytics.stats.highRiskMothers.toString(), MAMA_RED);
    drawKPIBox(pdf, 14 + (boxW + 6) * 2, boxY, boxW, boxH, "Total Doctors", analytics.stats.totalDoctors.toString(), "#5b21b6");
    drawKPIBox(pdf, 14 + (boxW + 6) * 3, boxY, boxW, boxH, "Midwives", analytics.stats.totalMidwives.toString(), "#1e40af");

    // Additional derived analytics specificity
    const riskPercentage = ((analytics.stats.highRiskMothers / analytics.stats.totalMothers) * 100).toFixed(1);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor("#444444");
    pdf.text(`* Overall system alert rate: ${riskPercentage}% of registered mothers are categorized as high risk.`, 14, boxY + boxH + 12);

    autoTable(pdf, {
      startY: boxY + boxH + 20,
      head: [["System Metric", "Data Value", "Unit"]],
      body: [
        ["Total Platform Access Count", analytics.stats.totalMothers + analytics.stats.totalDoctors + analytics.stats.totalMidwives, "Users"],
        ["Medical Professional Density", (analytics.stats.totalMothers / (analytics.stats.totalDoctors + analytics.stats.totalMidwives || 1)).toFixed(1), "Mothers per Staff"],
        ["Risk Prevalence Level", riskPercentage + "%", "System High Risk"],
      ],
      headStyles: { fillColor: MAMA_TEAL },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 }
    });
  }

  function addRisk(pdf: jsPDF, analytics: AnalyticsData, startY = 55) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("EPDS Risk Stratification Breakdown", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Risk Classification", "Mother Count", "Platform Percentage", "Status"]],
      body: analytics.riskDistribution.map((item) => {
        const perc = ((item.value / analytics.stats.totalMothers) * 100).toFixed(1) + "%";
        return [
          `${item.name} Risk`,
          item.value,
          perc,
          item.name === "High" ? "PRIORITY" : "STABLE"
        ];
      }),
      headStyles: { fillColor: MAMA_TEAL },
      bodyStyles: { fontSize: 10 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const val = data.cell.text[0];
          if (val.includes("High")) data.cell.styles.textColor = MAMA_RED;
          if (val.includes("Moderate")) data.cell.styles.textColor = MAMA_ORANGE;
          if (val.includes("Low")) data.cell.styles.textColor = MAMA_GREEN;
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  function addActivity(pdf: jsPDF, analytics: AnalyticsData, startY = 55) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Engagement Velocity & Staff Activity", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Timeline Period", "EPDS Check-ins", "Clinical Observations", "Total Interaction"]],
      body: analytics.epdsTrend.map((item, index) => {
        const obs = analytics.obsTrend[index]?.value ?? 0;
        return [
          item.label,
          item.value,
          obs,
          item.value + obs,
        ];
      }),
      headStyles: { fillColor: MAMA_TEAL },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }

  function addRegions(pdf: jsPDF, analytics: AnalyticsData, startY = 55) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Regional Performance Matrix", 14, startY);

    // Derived logic for "Top Regions"
    const topByMothers = [...analytics.regionalBreakdown].sort((a, b) => b.totalMothers - a.totalMothers).slice(0, 3);
    const topByRisk = [...analytics.regionalBreakdown].sort((a, b) => b.high - a.high).slice(0, 1)[0];

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor("#555555");
    pdf.text(`Primary Alert: ${topByRisk.name} region currently records the highest risk prevalence (${topByRisk.high} high-risk mothers).`, 14, startY + 8);

    autoTable(pdf, {
      startY: startY + 16,
      head: [["Region Name", "Reg. Mothers", "Activity", "Low", "Mod.", "High"]],
      body: analytics.regionalBreakdown.map((region) => [
        region.name,
        region.totalMothers,
        region.submissions,
        region.low,
        region.moderate,
        region.high,
      ]),
      headStyles: { fillColor: MAMA_TEAL },
      styles: { fontSize: 9 },
      columnStyles: {
        5: { textColor: MAMA_RED, fontStyle: "bold" }, // High Risk column
      },
      alternateRowStyles: { fillColor: [250, 251, 253] }
    });
  }

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF();
      addHeader(pdf, reportTitle(selectedReport));

      if (selectedReport === "full") {
        addSummary(pdf, data);
        pdf.addPage();
        addHeader(pdf, "System EPDS Risk Distribution");
        addRisk(pdf, data);
        pdf.addPage();
        addHeader(pdf, "System Activity Velocity");
        addActivity(pdf, data);
        pdf.addPage();
        addHeader(pdf, "Regional Performance Breakdown");
        addRegions(pdf, data);
      } else if (selectedReport === "risk") {
        addRisk(pdf, data);
      } else if (selectedReport === "activity") {
        addActivity(pdf, data);
      } else {
        addRegions(pdf, data);
      }

      addFooter(pdf);
      pdf.save(`superadmin_${selectedReport}_report_${timeFilter.toLowerCase()}.pdf`);
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="analytics-page">
      {/* HEADER */}
      <div className="analytics-header">
        <div className="role-header">
          <h1>System Analytics & Reports</h1>
          <p>Comprehensive insights across all regions, medical staff activity, and maternal risk distribution.</p>
        </div>

        <div className="analytics-actions">
          <div className="analytics-select-wrapper">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="analytics-select"
            >
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
              <option value="Year">This Year</option>
            </select>
            <span className="filter-select-icon">
              <ChevronDown size={18} />
            </span>
          </div>

          <button
            className="export-btn"
            onClick={() => setShowExportModal(true)}
            disabled={isExporting || isLoading}
          >
            <DownloadCloud size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div style={{ marginTop: "40px" }}>
          <LoadingState label="Analyzing system-wide data..." />
        </div>
      ) : !data ? (
        <div className="p-10 text-center">Failed to load analytics.</div>
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="stats-grid">
            <div className="stat-card teal">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-info">
                <p>Total Registered Mothers</p>
                <h2>{data.stats.totalMothers}</h2>
              </div>
            </div>

            <div className="stat-card red">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <p>System-wide High Risk</p>
                <h2>{data.stats.highRiskMothers}</h2>
              </div>
            </div>

            <div className="stat-card emerald">
              <div className="stat-icon"><Stethoscope size={24} /></div>
              <div className="stat-info">
                <p>Total Doctors</p>
                <h2>{data.stats.totalDoctors}</h2>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon"><Activity size={24} /></div>
              <div className="stat-info">
                <p>Total Midwives</p>
                <h2>{data.stats.totalMidwives}</h2>
              </div>
            </div>
          </div>

          {/* CHART GRID */}
          <div className="analytics-grid top-charts">
            {/* RISK DISTRIBUTION */}
            <div className="chart-card">
              <h3>EPDS Risk Distribution</h3>
              <p className="chart-subtitle">Aggregate breakdown of maternal mental health across all regions</p>
              <div className="risk-chart-wrap">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={data.riskDistribution}
                      innerRadius={65}
                      outerRadius={95}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {data.riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="risk-summary">
                  {data.riskDistribution.map((item) => (
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

            {/* SUBMISSION & OBSERVATION TRENDS */}
            <div className="chart-card">
              <div className="header-with-action" style={{ marginBottom: "8px" }}>
                <h3>System Activity Velocity</h3>

                <div className="chart-toggle-group">
                  <button
                    className={`toggle-btn ${activeActivityChart === "epds" ? "active" : ""}`}
                    onClick={() => setActiveActivityChart("epds")}
                  >
                    EPDS
                  </button>
                  <button
                    className={`toggle-btn ${activeActivityChart === "obs" ? "active" : ""}`}
                    onClick={() => setActiveActivityChart("obs")}
                  >
                    Observations
                  </button>
                </div>
              </div>

              <p className="chart-subtitle">
                {activeActivityChart === "epds"
                  ? "Daily/Weekly EPDS submissions logged globally"
                  : "Clinical observations recorded by medical staff"}
              </p>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={activeActivityChart === "epds" ? data.epdsTrend : data.obsTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} />
                  <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "12px", border: "none" }} />
                  <Bar
                    dataKey="value"
                    fill={activeActivityChart === "epds" ? "#499d85" : "#60a5fa"}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* REGIONAL BREAKDOWN */}
          <div className="analytics-grid">
            <div className="chart-card card-span-2">
              <div className="header-with-action">
                <div>
                  <h3>Regional Performance Breakdown</h3>
                  <p className="chart-subtitle">Operational metrics comparison across assigned regions</p>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Total Mothers</th>
                      <th>Submissions</th>
                      <th>Low Risk</th>
                      <th>Moderate</th>
                      <th>High Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.regionalBreakdown.slice((regionalPage - 1) * regionalPageSize, regionalPage * regionalPageSize).map((region, index) => (
                      <tr key={`${region.name}-${index}`}>
                        <td><strong>{region.name}</strong></td>
                        <td>{region.totalMothers}</td>
                        <td>{region.submissions}</td>
                        <td>{region.low}</td>
                        <td>{region.moderate}</td>
                        <td>{region.high}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.regionalBreakdown.length > regionalPageSize && (
                <div className="table-pagination">
                  <span className="pagination-text">
                    Showing {Math.min(data.regionalBreakdown.length, (regionalPage - 1) * regionalPageSize + 1)} to {Math.min(data.regionalBreakdown.length, regionalPage * regionalPageSize)} of {data.regionalBreakdown.length} regions
                  </span>
                  <div className="pagination-btns">
                    <button
                      className={`pager-btn ${regionalPage === 1 ? "disabled" : ""}`}
                      onClick={() => setRegionalPage(p => Math.max(1, p - 1))}
                      disabled={regionalPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      className={`pager-btn ${regionalPage >= Math.ceil(data.regionalBreakdown.length / regionalPageSize) ? "disabled" : ""}`}
                      onClick={() => setRegionalPage(p => Math.min(Math.ceil(data.regionalBreakdown.length / regionalPageSize), p + 1))}
                      disabled={regionalPage >= Math.ceil(data.regionalBreakdown.length / regionalPageSize)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showExportModal && data ? (
            <ModalWrapper variant="export" onClose={() => setShowExportModal(false)}>
              <div className="analytics-export-modal">
                <div className="analytics-export-header">
                  <span className="analytics-export-eyebrow">PDF Export</span>
                  <h2 className="modal-title">Export System Report</h2>
                  <p>Choose one system analytics report and export it as a PDF.</p>
                </div>

                <div className="analytics-export-fields">
                  <div className="analytics-export-field">
                    <label htmlFor="superadmin-report-type">Report Type</label>
                    <div className="analytics-select-wrapper">
                      <select
                        id="superadmin-report-type"
                        className="analytics-select"
                        value={selectedReport}
                        onChange={(event) => setSelectedReport(event.target.value as ReportType)}
                      >
                        <option value="full">Full System Analytics Report</option>
                        <option value="risk">EPDS Risk Distribution Report</option>
                        <option value="activity">Activity Velocity Report</option>
                        <option value="regions">Regional Performance Report</option>
                      </select>
                      <ChevronDown className="filter-select-icon teal" size={18} />
                    </div>
                  </div>

                  <div className="analytics-export-field">
                    <label htmlFor="superadmin-report-range">Date Range</label>
                    <div className="analytics-select-wrapper">
                      <select
                        id="superadmin-report-range"
                        className="analytics-select"
                        value={timeFilter}
                        onChange={(event) => {
                          setTimeFilter(event.target.value);
                          setRegionalPage(1);
                        }}
                      >
                        <option value="Week">This Week</option>
                        <option value="Month">This Month</option>
                        <option value="Year">This Year</option>
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
        </>
      )}
    </div>
  );
}
