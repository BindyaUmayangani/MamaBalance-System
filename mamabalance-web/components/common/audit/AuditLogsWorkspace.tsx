"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, DownloadCloud } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import LoadingState from "@/components/admin/LoadingState";
import Pagination from "@/app/superadmin/components/Pagination";
import "@/app/superadmin/styles/auditLogs.css";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/superadmin/styles/analyticsReports.css";

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

type AuditLogsWorkspaceProps = {
  title: string;
  subtitle: string;
  scope?: "all" | "regionaladmin";
  showRegionFilter?: boolean;
  exportLabel: string;
  statsLabels: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
};

type AuditResponse = {
  logs: AuditLogRow[];
  filters: {
    regions: string[];
    modules: string[];
    actionTypes: string[];
    actorRoles: string[];
  };
  stats: {
    total24h: number;
    userEvents: number;
    securityEvents: number;
    contentEvents: number;
  };
};

const chipClassByModule: Record<string, string> = {
  Users: "users",
  Content: "content",
  Visits: "users",
  Observations: "content",
  Settings: "system",
  Support: "system",
  Notifications: "system",
  Security: "system",
};

export default function AuditLogsWorkspace({
  title,
  subtitle,
  scope = "all",
  showRegionFilter = true,
  exportLabel,
  statsLabels,
}: AuditLogsWorkspaceProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState<AuditResponse["filters"]>({
    regions: [],
    modules: [],
    actionTypes: [],
    actorRoles: [],
  });
  const [stats, setStats] = useState<AuditResponse["stats"]>({
    total24h: 0,
    userEvents: 0,
    securityEvents: 0,
    contentEvents: 0,
  });
  const [regionFilter, setRegionFilter] = useState("All");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [actionTypeFilter, setActionTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/audit-logs?scope=${scope}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load audit logs.");
      }

      setLogs(payload.logs || []);
      setFilters(payload.filters);
      setStats(payload.stats);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load audit logs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesRegion = regionFilter === "All" || log.region === regionFilter;
      const matchesModule = moduleFilter === "All" || log.module === moduleFilter;
      const matchesRole = roleFilter === "All" || log.actorRole === roleFilter;
      const matchesActionType =
        actionTypeFilter === "All" || log.actionType === actionTypeFilter;
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        [log.actor, log.region, log.module, log.action, log.target]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return (
        matchesRegion &&
        matchesModule &&
        matchesRole &&
        matchesActionType &&
        matchesSearch
      );
    });
  }, [actionTypeFilter, logs, moduleFilter, regionFilter, roleFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, regionFilter, moduleFilter, roleFilter, actionTypeFilter]);

  const totalItems = filteredLogs.length;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function formatTimestamp(value: string | null) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleExportPDF() {
    const pdf = new jsPDF("l", "mm", "a4"); // Landscape for audit log width
    const MAMA_TEAL = "#499d85";
    const pageWidth = pdf.internal.pageSize.width;

    // Header Branding
    pdf.setFillColor(MAMA_TEAL);
    pdf.rect(0, 0, pageWidth, 40, "F");
    pdf.setTextColor("#ffffff");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("MamaBalance", 14, 16);
    pdf.setFontSize(13);
    pdf.text("System-Wide Audit Intelligence", 14, 24);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Audit Log Report - System Scope`, 14, 31);

    // Metadata Right-aligned
    pdf.setFontSize(9);
    const dateStr = new Date().toLocaleString("en-LK");
    pdf.text(`Generated: ${dateStr}`, pageWidth - 14, 15, { align: "right" });
    pdf.text(`Region Scope: ${regionFilter}`, pageWidth - 14, 22, { align: "right" });

    // Executive Description
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    const executiveDesc = "System-wide audit intelligence summarizing administrative actions, security events, and clinical platform modifications to ensure transparency and accountability across MamaBalance workflows.";
    pdf.text(executiveDesc, 14, 48, { maxWidth: pageWidth - 28 });

    // KPI Summary Boxes
    const boxW = 60;
    const boxH = 22;
    const startY = 56;
    
    // KPI 1: Total
    pdf.setDrawColor(73, 157, 133);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(14, startY, boxW, boxH, 3, 3, "FD");
    pdf.setTextColor(73, 157, 133);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("TOTAL EVENTS", 19, startY + 7);
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(16);
    pdf.text(String(totalItems), 19, startY + 16);

    // KPI 2: Security
    pdf.setDrawColor(220, 38, 38);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(14 + boxW + 5, startY, boxW, boxH, 3, 3, "FD");
    pdf.setTextColor(220, 38, 38);
    pdf.setFontSize(8);
    pdf.text("SECURITY & CONTENT", 19 + boxW + 5, startY + 7);
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(16);
    pdf.text(String(stats.securityEvents + stats.contentEvents), 19 + boxW + 5, startY + 16);

    // KPI 3: System Context
    pdf.setDrawColor(59, 130, 246);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(14 + (boxW + 5) * 2, startY, boxW, boxH, 3, 3, "FD");
    pdf.setTextColor(59, 130, 246);
    pdf.setFontSize(8);
    pdf.text("LOGGED PERIOD", 19 + (boxW + 5) * 2, startY + 7);
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(14);
    pdf.text("Full History Scope", 19 + (boxW + 5) * 2, startY + 16);

    // Section Title
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(31, 41, 55);
    pdf.text("Activity Logs & Event Breakdown", 14, startY + 32);

    // Table
    autoTable(pdf, {
      startY: startY + 38,
      head: [["Timestamp", "Actor", "Role", "Region", "Module", "Action Type", "Action", "Target"]],
      body: filteredLogs.map((log) => [
        formatTimestamp(log.timestamp),
        log.actor,
        log.actorRole,
        log.region,
        log.module,
        log.actionType,
        log.action,
        log.target,
      ]),
      headStyles: { fillColor: [73, 157, 133], fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        4: { cellWidth: 25 },
        6: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Confidential - MamaBalance System Audit Log - Page ${i} of ${pageCount}`, 14, pdf.internal.pageSize.height - 10);
    }

    pdf.save(`mamabalance_audit_log_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  function handleExportCSV() {
    const timestamp = new Date().toLocaleString("en-LK");
    
    // Polished Header Metadata
    const metadata = [
      ["SYSTEM NAME", "MamaBalance Intelligence Platform"],
      ["REPORT TYPE", "Consolidated Audit Log Activity"],
      ["REGION SCOPE", regionFilter],
      ["EXPORTED AT", timestamp],
      ["TOTAL RECORDS", String(totalItems)],
      [], // Spacer
    ];

    const dataHeaders = [
      "Timestamp",
      "Actor",
      "Actor Role",
      "Region",
      "Module",
      "Action Type",
      "Action",
      "Target",
    ];

    const bodyRows = filteredLogs.map((log) => [
      formatTimestamp(log.timestamp),
      log.actor,
      log.actorRole,
      log.region,
      log.module,
      log.actionType,
      log.action,
      log.target,
    ]);

    const csvContent = [
      ...metadata.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      dataHeaders.map(h => `"${h}"`).join(","),
      ...bodyRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div className="role-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="analytics-actions">
          <button className="export-btn secondary" onClick={handleExportCSV} disabled={isLoading || filteredLogs.length === 0}>
            <DownloadCloud size={18} />
            <span>Export CSV</span>
          </button>
          <button className="export-btn" onClick={handleExportPDF} disabled={isLoading || filteredLogs.length === 0}>
            <DownloadCloud size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="audit-filters">
        {showRegionFilter && (
          <div className="audit-filter-select">
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              <option value="All">Region: All</option>
              {filters.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <span className="audit-filter-icon">
              <ChevronDown size={18} />
            </span>
          </div>
        )}
        <div className="audit-filter-select">
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
            <option value="All">Module: All</option>
            {filters.modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
          <span className="audit-filter-icon">
            <ChevronDown size={18} />
          </span>
        </div>
        <div className="audit-filter-select">
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="All">Actor Role: All</option>
            {filters.actorRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <span className="audit-filter-icon">
            <ChevronDown size={18} />
          </span>
        </div>
        <div className="audit-filter-select">
          <select
            value={actionTypeFilter}
            onChange={(event) => setActionTypeFilter(event.target.value)}
          >
            <option value="All">Action Type: All</option>
            {filters.actionTypes.map((actionType) => (
              <option key={actionType} value={actionType}>
                {actionType}
              </option>
            ))}
          </select>
          <span className="audit-filter-icon">
            <ChevronDown size={18} />
          </span>
        </div>
        <div className={`audit-search-box ${showRegionFilter ? "audit-search-wide" : ""}`}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search actor, action, target..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit logs..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="audit-cards">
            <div className="audit-card">
              <h3>{statsLabels.primary}</h3>
              <strong>{stats.total24h}</strong>
            </div>
            <div className="audit-card">
              <h3>{statsLabels.secondary}</h3>
              <strong>{stats.userEvents}</strong>
            </div>
            <div className="audit-card">
              <h3>{statsLabels.tertiary}</h3>
              <strong>{stats.securityEvents + stats.contentEvents}</strong>
            </div>
          </div>

          <div className="audit-table-card">
            {filteredLogs.length > 0 ? (
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Actor Role</th>
                    {showRegionFilter && <th>Region</th>}
                    <th>Module</th>
                    <th>Action Type</th>
                    <th>Action</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatTimestamp(log.timestamp)}</td>
                      <td>{log.actor}</td>
                      <td>{log.actorRole}</td>
                      {showRegionFilter && <td>{log.region}</td>}
                      <td>
                        <span className={`audit-chip ${chipClassByModule[log.module] || "system"}`}>
                          {log.module}
                        </span>
                      </td>
                      <td>{log.actionType}</td>
                      <td className="audit-action">{log.action}</td>
                      <td>{log.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  <Search size={26} strokeWidth={2.2} />
                </div>
                <h3>No audit log events found</h3>
                <p>Try a different keyword or date range to find the regional activity you want to review.</p>
                <div className="doctor-empty-state-tips">
                  <span>Check spelling</span>
                  <span>Adjust date range</span>
                  <span>Clear filters</span>
                </div>
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
