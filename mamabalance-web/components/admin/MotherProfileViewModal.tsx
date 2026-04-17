import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ManagedMotherRow } from "@/lib/admin/types";
import { generatePatientSummaryPdf, type PatientSummaryResponse } from "@/lib/doctor/patientSummaryPdf";
import "@/app/superadmin/styles/userManagement.css";

type Props = {
  mother: ManagedMotherRow;
  onClose: () => void;
};

type MotherDetails = ManagedMotherRow & {
  epdsHistory?: Array<{
    id: string;
    score: number;
    submittedAt: string | null;
    label: string;
  }>;
};

function riskLabel(value: string) {
  const normalized = String(value || "low").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function riskClass(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high" || normalized === "moderate" || normalized === "low") {
    return normalized;
  }
  return "low";
}

export default function MotherProfileViewModal({ mother, onClose }: Props) {
  const [details, setDetails] = useState<MotherDetails>(mother);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  const displayMother = details;
  const motherRiskClass = riskClass(displayMother.riskStatus);

  // Group EPDS scores by Month Year
  const groupedByMonth = useMemo(() => {
    const history = displayMother.epdsHistory || [];
    const groups: Record<string, typeof history> = {};

    history.forEach((item) => {
      const date = item.submittedAt ? new Date(item.submittedAt) : new Date();
      const monthKey = date.toLocaleString("default", { month: "long", year: "numeric" });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    return groups;
  }, [displayMother.epdsHistory]);

  const availableMonths = useMemo(() => Object.keys(groupedByMonth).reverse(), [groupedByMonth]);

  // Set default month when data is loaded
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const epdsTrend = useMemo(() => {
    const history = groupedByMonth[selectedMonth] || [];

    return history.map((item) => ({
      label: item.label,
      score: item.score,
    }));
  }, [groupedByMonth, selectedMonth]);

  const chartPoints = useMemo(() => {
    return epdsTrend.map((point, index) => {
      const usableWidth = 252;
      const step = epdsTrend.length > 1 ? usableWidth / (epdsTrend.length - 1) : 0;

      return {
        ...point,
        x: epdsTrend.length > 1 ? 58 + index * step : 184,
        y: 210 - Math.min(30, Math.max(0, point.score)) * 6,
      };
    });
  }, [epdsTrend]);

  const handleMonthShift = (direction: "prev" | "next") => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const nextIndex = direction === "next" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < availableMonths.length) {
      setSelectedMonth(availableMonths[nextIndex]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      try {
        setIsLoadingDetails(true);
        setDetailError("");

        const response = await fetch(`/api/admin/mothers/${encodeURIComponent(mother.uid)}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as MotherDetails & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load mother details.");
        }

        if (isMounted) setDetails(payload);
      } catch (caughtError) {
        if (isMounted) {
          setDetailError(
            caughtError instanceof Error ? caughtError.message : "Unable to load mother details.",
          );
        }
      } finally {
        if (isMounted) setIsLoadingDetails(false);
      }
    }

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [mother.uid]);

  async function handleDownloadSummary() {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/admin/mothers/${encodeURIComponent(mother.uid)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PatientSummaryResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate patient summary report.");
      }

      generatePatientSummaryPdf(payload);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to generate patient summary report.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mother-profile-modal">
      <div className="profile-banner">
        <div>
          <h2>Mother Profile: {displayMother.name}</h2>
          {isLoadingDetails ? <p className="profile-load-note">Refreshing from database...</p> : null}
          {detailError ? <p className="profile-error-note">{detailError}</p> : null}
        </div>
        <span className={`profile-risk-badge ${motherRiskClass}`}>
          {riskLabel(displayMother.riskStatus)}
        </span>
      </div>

      <div className="profile-top-grid">
        <div className="profile-panel">
          <h3>Personal Info</h3>
          <div className="profile-info-list">
            <p><span>Name:</span> <strong>{displayMother.name}</strong></p>
            <p><span>NIC:</span> <strong>{displayMother.nic || "-"}</strong></p>
            <p><span>Email:</span> <strong>{displayMother.email || "-"}</strong></p>
            <p><span>Current Email:</span> <strong>{displayMother.personalEmail || "-"}</strong></p>
            <p><span>Region:</span> <strong>{displayMother.region || "-"}</strong></p>
            <p><span>Contact No:</span> <strong>{displayMother.contact || "-"}</strong></p>
            <p><span>Birthday:</span> <strong>{displayMother.birthdate || "-"}</strong></p>
            <p><span>Age:</span> <strong>{displayMother.age || "-"}</strong></p>
            <p><span>Address:</span> <strong>{displayMother.address || "-"}</strong></p>
            <p><span>Guardian Name:</span> <strong>{displayMother.guardianName || "-"}</strong></p>
            <p><span>Guardian Contact No:</span> <strong>{displayMother.guardianContact || "-"}</strong></p>
            <p><span>Delivery Date:</span> <strong>{displayMother.deliveryDate || "-"}</strong></p>
            <p><span>No of Children:</span> <strong>{displayMother.noOfChildren ?? "-"}</strong></p>
            <p><span>Assigned Midwife:</span> <strong>{displayMother.assignedMidwife || "-"}</strong></p>
            <p><span>Assigned Doctor:</span> <strong>{displayMother.assignedDoctor || "-"}</strong></p>
            <p><span>Last EPDS Test Date:</span> <strong>{displayMother.lastEpdTestDate || "-"}</strong></p>
            <p><span>Created On:</span> <strong>{displayMother.createdOn || "-"}</strong></p>
            <p><span>Status:</span> <strong>{displayMother.status === "active" ? "Active" : "Inactive"}</strong></p>
          </div>
        </div>

        <div className="profile-panel">
          <h3>EPDS Score Trend</h3>
          <div className="epds-chart-card">
            {chartPoints.length > 0 ? (
              <>
                <svg viewBox="0 0 360 250" className="epds-chart" aria-label="EPDS score trend">
                  {[0, 5, 10, 15, 20, 25, 30].map((tick) => {
                    const y = 210 - tick * 6;
                    return (
                      <g key={tick}>
                        <line x1="52" y1={y} x2="320" y2={y} className="chart-grid-line" />
                        <text x="18" y={y + 4} className="chart-axis-label">
                          {String(tick).padStart(2, "0")}
                        </text>
                      </g>
                    );
                  })}
                  {chartPoints.length > 1 ? (
                    <polyline
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    />
                  ) : null}
                  {chartPoints.map((point, index) => (
                    <g key={`${point.score}-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        className={`chart-point ${index === chartPoints.length - 1 ? "latest" : ""}`}
                      >
                        <title>EPDS score: {point.score}</title>
                      </circle>
                    </g>
                  ))}
                  {chartPoints.map((point) => (
                    <text key={point.label} x={point.x - 18} y="236" className="chart-axis-label x-axis">
                      {point.label}
                    </text>
                  ))}
                </svg>
                
                <div className="month-toggle-row">
                  <div className="month-toggle-group">
                    <button 
                      className="month-toggle-btn"
                      onClick={() => handleMonthShift("prev")}
                      disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
                      title="Previous Month"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="selected-month-label">{selectedMonth}</span>
                    <button 
                      className="month-toggle-btn"
                      onClick={() => handleMonthShift("next")}
                      disabled={availableMonths.indexOf(selectedMonth) === 0}
                      title="Next Month"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <p className="chart-month-label" style={{ marginTop: '10px' }}>
                  Latest in selection: {chartPoints.at(-1)?.score ?? "-"}
                </p>
              </>
            ) : (
              <div className="epds-empty-state">
                <h4>No EPDS tests recorded</h4>
                <p>EPDS trend points will appear here after the mother submits assessments.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-outline" onClick={() => void handleDownloadSummary()} disabled={isDownloading}>
          {isDownloading ? "Generating..." : "Download Summary Report"}
        </button>
        <button className="btn-outline" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
