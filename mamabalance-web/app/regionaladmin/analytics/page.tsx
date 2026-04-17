"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  DownloadCloud,
  Stethoscope,
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
import ModalWrapper from "@/app/superadmin/educational-content/modals/ModalWrapper";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/superadmin/styles/analyticsReports.css";

type ReportType = "full" | "risk" | "activity" | "careTeam" | "operations";

type CareTeamRow = {
  uid: string;
  name: string;
  role: string;
  assignedMothers: number;
  highRiskMothers: number;
  observations: number;
};

type AnalyticsData = {
  regionName: string;
  stats: {
    totalMothers: number;
    highRiskMothers: number;
    totalDoctors: number;
    totalMidwives: number;
    epdsSubmissions: number;
    observations: number;
    overdueFollowups: number;
  };
  riskDistribution: { name: string; value: number; color: string }[];
  epdsTrend: { label: string; value: number }[];
  obsTrend: { label: string; value: number }[];
  careTeamBreakdown: CareTeamRow[];
};

export default function RegionalAnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState("Month");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeActivityChart, setActiveActivityChart] = useState<"epds" | "obs">("epds");
  const [careTeamPage, setCareTeamPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>("full");
  const careTeamPageSize = 5;

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/regionaladmin/analytics?filter=${timeFilter.toLowerCase()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as AnalyticsData & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load regional analytics.");
        }

        if (isMounted) setData(payload);
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load regional analytics.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [timeFilter]);

  const activityData = useMemo(() => {
    if (!data) return [];
    return activeActivityChart === "epds" ? data.epdsTrend : data.obsTrend;
  }, [activeActivityChart, data]);

  const pagedCareTeamRows = useMemo(() => {
    if (!data) return [];
    return data.careTeamBreakdown.slice(
      (careTeamPage - 1) * careTeamPageSize,
      careTeamPage * careTeamPageSize,
    );
  }, [careTeamPage, data]);

  const careTeamTotalPages = data
    ? Math.max(1, Math.ceil(data.careTeamBreakdown.length / careTeamPageSize))
    : 1;

  function getReportTitle(reportType: ReportType) {
    switch (reportType) {
      case "risk":
        return "Regional EPDS Risk Distribution Report";
      case "activity":
        return "Regional Activity Velocity Report";
      case "careTeam":
        return "Regional Care Team Workload Report";
      case "operations":
        return "Regional Operational Snapshot Report";
      default:
        return "Regional Analytics Report";
    }
  }

  const MAMA_TEAL = "#499d85";
  const MAMA_RED = "#dc2626";
  const MAMA_ORANGE = "#fb923c";
  const MAMA_GREEN = "#22c55e";

  function addHeader(pdf: jsPDF, title: string, regionName: string) {
    // Brand Background Bar
    pdf.setFillColor(MAMA_TEAL);
    pdf.rect(0, 0, pdf.internal.pageSize.width, 40, "F");

    // Header Content
    pdf.setTextColor("#ffffff");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("MamaBalance", 14, 16);

    pdf.setFontSize(13);
    pdf.text("Regional Analytics Reports", 14, 24);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${title} - ${regionName}`, 14, 31);

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

  function reportDescription(reportType: ReportType) {
    switch (reportType) {
      case "full":
        return "Comprehensive regional oversight summarizing maternal risk distribution, care team capacity, system engagement velocity, and operational health benchmarks.";
      case "risk":
        return "Analysis of maternal mental-health risk distribution based on EPDS screening scores across the regional population.";
      case "activity":
        return "Velocity report tracking clinical engagement, monitoring the frequency of EPDS submissions and care team observations.";
      case "careTeam":
        return "Operational workload assessment tracking assigned mother counts, high-risk cases, and clinical documentation activity per staff member.";
      default:
        return "Regional operational snapshot highlighting key performance indicators and active clinical engagement metrics.";
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

  function addSummaryBoxes(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    const boxW = 45;
    const boxH = 24;
    const gap = 3;

    drawKPIBox(pdf, "Total Mothers", analytics.stats.totalMothers, 14, startY, boxW, boxH, [73, 157, 133]);
    drawKPIBox(pdf, "High Risk", analytics.stats.highRiskMothers, 14 + boxW + gap, startY, boxW, boxH, [220, 38, 38]);
    drawKPIBox(pdf, "Care Team", analytics.stats.totalDoctors + analytics.stats.totalMidwives, 14 + (boxW + gap) * 2, startY, boxW, boxH, [59, 130, 246]);
    drawKPIBox(pdf, "Submissions", analytics.stats.epdsSubmissions, 14 + (boxW + gap) * 3, startY, boxW, boxH, [16, 185, 129]);
  }

  function addMetricsTable(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Regional Operational Performance Metrics", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Metric", "Value"]],
      body: [
        ["Mothers in Region", analytics.stats.totalMothers],
        ["High Risk Mothers", analytics.stats.highRiskMothers],
        ["Regional Doctors", analytics.stats.totalDoctors],
        ["Regional Midwives", analytics.stats.totalMidwives],
        ["EPDS Submissions", analytics.stats.epdsSubmissions],
        ["Clinical Observations", analytics.stats.observations],
        ["Overdue Follow-ups", analytics.stats.overdueFollowups],
      ],
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addRiskReport(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Regional EPDS Risk Distribution Analysis", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Risk Level", "Mother Count", "Distribution"]],
      body: analytics.riskDistribution.map((item) => {
        const percentage = analytics.stats.totalMothers > 0
          ? ((item.value / analytics.stats.totalMothers) * 100).toFixed(1)
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

  function addActivityReport(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("System Engagement & Activity Velocity", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Period", "EPDS Submissions", "Clinical Observations"]],
      body: analytics.epdsTrend.map((item, index) => [
        item.label,
        item.value,
        analytics.obsTrend[index]?.value ?? 0,
      ]),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  function addCareTeamReport(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Regional Care Team Capacity Benchmarks", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Staff Member", "Role", "Assigned Mothers", "High Risk", "Observations"]],
      body:
        analytics.careTeamBreakdown.length > 0
          ? analytics.careTeamBreakdown.map((row) => [
            row.name,
            row.role,
            row.assignedMothers,
            row.highRiskMothers,
            row.observations,
          ])
          : [["No care team members found", "-", "-", "-", "-"]],
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold" },
      }
    });
  }

  function addOperationsReport(pdf: jsPDF, analytics: AnalyticsData, startY = 48) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text("Regional Service Delivery Summaries", 14, startY);

    autoTable(pdf, {
      startY: startY + 8,
      head: [["Metric", "Value", "Strategic Focus"]],
      body: [
        ["EPDS Submissions", analytics.stats.epdsSubmissions, "Mother screening participation"],
        ["Clinical Observations", analytics.stats.observations, "Care team documentation activity"],
        ["Overdue Follow-ups", analytics.stats.overdueFollowups, "Visits needing immediate attention"],
        ["Latest Reporting Period", timeFilter, "Current chart filter scope"],
      ],
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
    });
  }

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF();
      addHeader(pdf, getReportTitle(selectedReport), data.regionName);

      const description = reportDescription(selectedReport);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 116, 139);
      pdf.text(description, 14, 48, { maxWidth: pdf.internal.pageSize.width - 28 });

      if (selectedReport === "full") {
        addSummaryBoxes(pdf, data, 54);
        pdf.addPage();
        addHeader(pdf, "Regional EPDS Risk Distribution", data.regionName);
        addRiskReport(pdf, data, 54);
        pdf.addPage();
        addHeader(pdf, "Regional Activity Velocity", data.regionName);
        addActivityReport(pdf, data, 54);
        pdf.addPage();
        addHeader(pdf, "Regional Care Team Workload", data.regionName);
        addCareTeamReport(pdf, data, 54);
        pdf.addPage();
        addHeader(pdf, "Regional Operational Snapshot", data.regionName);
        addOperationsReport(pdf, data, 54);
      } else if (selectedReport === "risk") {
        addRiskReport(pdf, data, 54);
      } else if (selectedReport === "activity") {
        addActivityReport(pdf, data, 54);
      } else if (selectedReport === "careTeam") {
        addCareTeamReport(pdf, data, 54);
      } else {
        addOperationsReport(pdf, data, 54);
      }

      addFooter(pdf);
      pdf.save(
        `regional_${selectedReport}_report_${data.regionName.replace(/\s+/g, "_").toLowerCase()}_${timeFilter.toLowerCase()}.pdf`,
      );
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="role-header">
          <h1>Regional Analytics & Reports</h1>
          <p>
            Region-specific insights for mothers, care team coverage, EPDS activity, and follow-up workload.
          </p>
        </div>

        <div className="analytics-actions">
          <div className="analytics-select-wrapper">
            <select
              value={timeFilter}
              onChange={(event) => {
                setTimeFilter(event.target.value);
                setCareTeamPage(1);
              }}
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
            disabled={isExporting || isLoading || !data}
          >
            <DownloadCloud size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div style={{ marginTop: "40px" }}>
          <LoadingState label="Analyzing regional data..." />
        </div>
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : !data ? (
        <LoadingState label="No analytics data available." variant="error" />
      ) : (
        <>
          <div className="analytics-subtitle" style={{ marginBottom: "22px" }}>
            Reporting scope: {data.regionName}
          </div>

          <div className="stats-grid">
            <div className="stat-card teal">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-info">
                <p>Mothers in Region</p>
                <h2>{data.stats.totalMothers}</h2>
              </div>
            </div>

            <div className="stat-card red">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <p>High Risk Mothers</p>
                <h2>{data.stats.highRiskMothers}</h2>
              </div>
            </div>

            <div className="stat-card emerald">
              <div className="stat-icon"><Stethoscope size={24} /></div>
              <div className="stat-info">
                <p>Regional Doctors</p>
                <h2>{data.stats.totalDoctors}</h2>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon"><Activity size={24} /></div>
              <div className="stat-info">
                <p>Regional Midwives</p>
                <h2>{data.stats.totalMidwives}</h2>
              </div>
            </div>
          </div>

          <div className="analytics-grid top-charts">
            <div className="chart-card">
              <h3>Regional EPDS Risk Distribution</h3>
              <p className="chart-subtitle">Maternal mental-health risk breakdown inside {data.regionName}</p>
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
                      {data.riskDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
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

            <div className="chart-card">
              <div className="header-with-action" style={{ marginBottom: "8px" }}>
                <h3>Regional Activity Velocity</h3>

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
                  ? "EPDS submissions logged by mothers in this region"
                  : "Clinical observations recorded for mothers in this region"}
              </p>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 13 }} allowDecimals={false} />
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

          <div className="analytics-grid">
            <div className="chart-card card-span-2">
              <div className="header-with-action">
                <div>
                  <h3>Regional Care Team Workload</h3>
                  <p className="chart-subtitle">Assigned mothers, high-risk load, and observation activity by staff member</p>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Assigned Mothers</th>
                      <th>High Risk</th>
                      <th>Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.careTeamBreakdown.length > 0 ? (
                      pagedCareTeamRows.map((row) => (
                        <tr key={row.uid}>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.role}</td>
                          <td>{row.assignedMothers}</td>
                          <td>{row.highRiskMothers}</td>
                          <td>{row.observations}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "34px", color: "#64748b" }}>
                          No regional care team members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {data.careTeamBreakdown.length > careTeamPageSize && (
                <div className="table-pagination">
                  <span className="pagination-text">
                    Showing {Math.min(data.careTeamBreakdown.length, (careTeamPage - 1) * careTeamPageSize + 1)} to {Math.min(data.careTeamBreakdown.length, careTeamPage * careTeamPageSize)} of {data.careTeamBreakdown.length} staff members
                  </span>
                  <div className="pagination-btns">
                    <button
                      className={`pager-btn ${careTeamPage === 1 ? "disabled" : ""}`}
                      onClick={() => setCareTeamPage((page) => Math.max(1, page - 1))}
                      disabled={careTeamPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      className={`pager-btn ${careTeamPage >= careTeamTotalPages ? "disabled" : ""}`}
                      onClick={() => setCareTeamPage((page) => Math.min(careTeamTotalPages, page + 1))}
                      disabled={careTeamPage >= careTeamTotalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="chart-card card-span-2">
              <h3>Regional Operational Snapshot</h3>
              <p className="chart-subtitle">Current reporting totals for {data.regionName}</p>

              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>EPDS Submissions</td>
                      <td>{data.stats.epdsSubmissions}</td>
                      <td>Mother screening participation</td>
                    </tr>
                    <tr>
                      <td>Clinical Observations</td>
                      <td>{data.stats.observations}</td>
                      <td>Care team documentation activity</td>
                    </tr>
                    <tr>
                      <td>Overdue Follow-ups</td>
                      <td>{data.stats.overdueFollowups}</td>
                      <td>Visits or checkups needing attention</td>
                    </tr>
                    <tr>
                      <td>Latest Reporting Period</td>
                      <td>{timeFilter === "Week" ? "This Week" : timeFilter === "Year" ? "This Year" : "This Month"}</td>
                      <td>Current chart filter scope</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {showExportModal && data ? (
        <ModalWrapper variant="export" onClose={() => setShowExportModal(false)}>
          <div className="analytics-export-modal">
            <div className="analytics-export-header">
              <span className="analytics-export-eyebrow">PDF Export</span>
              <h2 className="modal-title">Export Regional Report</h2>
              <p>
                Choose one analytics report from {data.regionName} and export it as a PDF.
              </p>
            </div>

            <div className="analytics-export-fields">
              <div className="analytics-export-field">
                <label htmlFor="regional-report-type">Report Type</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="regional-report-type"
                    className="analytics-select"
                    value={selectedReport}
                    onChange={(event) => setSelectedReport(event.target.value as ReportType)}
                  >
                    <option value="full">Full Regional Analytics Report</option>
                    <option value="risk">EPDS Risk Distribution Report</option>
                    <option value="activity">Activity Velocity Report</option>
                    <option value="careTeam">Care Team Workload Report</option>
                    <option value="operations">Operational Snapshot Report</option>
                  </select>
                  <ChevronDown className="filter-select-icon teal" size={18} />
                </div>
              </div>

              <div className="analytics-export-field">
                <label htmlFor="regional-report-range">Date Range</label>
                <div className="analytics-select-wrapper">
                  <select
                    id="regional-report-range"
                    className="analytics-select"
                    value={timeFilter}
                    onChange={(event) => {
                      setTimeFilter(event.target.value);
                      setCareTeamPage(1);
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
