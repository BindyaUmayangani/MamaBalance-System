import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ManagedMotherRow } from "@/lib/admin/types";
import EpdsTrendChart from "@/components/common/EpdsTrendChart";
import { generatePatientSummaryPdf, type PatientSummaryResponse } from "@/lib/doctor/patientSummaryPdf";
import "@/app/doctor/styles/AssignedMothers.css";

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
  const [isMounted, setIsMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const displayMother = details;
  const motherRiskClass = riskClass(displayMother.riskStatus);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMounted]);

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

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className="modal-overlay assigned-mothers-modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 10000 }}
    >
      <div
        className="modal-card mother-profile-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Mother profile for ${displayMother.name}`}
        style={{ zIndex: 10001, position: "relative" }}
      >
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
            <p><span>MamaBalance Email:</span> <strong>{displayMother.email || "-"}</strong></p>
            <p><span>Personal Email:</span> <strong>{displayMother.personalEmail || "-"}</strong></p>
            <p><span>Region:</span> <strong>{displayMother.region || "-"}</strong></p>
            <p><span>Assigned Midwife:</span> <strong>{displayMother.assignedMidwife || "-"}</strong></p>
            <p><span>Assigned Doctor:</span> <strong>{displayMother.assignedDoctor || "-"}</strong></p>
            <p><span>Last EPDS Test Date:</span> <strong>{displayMother.lastEpdTestDate || "-"}</strong></p>
            <p><span>Created On:</span> <strong>{displayMother.createdOn || "-"}</strong></p>
            <p><span>Status:</span> <strong>{displayMother.status === "active" ? "Active" : "Inactive"}</strong></p>
            <p><span>Contact No:</span> <strong>{displayMother.contact || "-"}</strong></p>
            <p><span>Birthday:</span> <strong>{displayMother.birthdate || "-"}</strong></p>
            <p><span>Age:</span> <strong>{displayMother.age || "-"}</strong></p>
            <p><span>Address:</span> <strong>{displayMother.address || "-"}</strong></p>
            <p><span>Guardian Name:</span> <strong>{displayMother.guardianName || "-"}</strong></p>
            <p><span>Guardian Contact No:</span> <strong>{displayMother.guardianContact || "-"}</strong></p>
            <p><span>Delivery Date:</span> <strong>{displayMother.deliveryDate || "-"}</strong></p>
            <p><span>No of Children:</span> <strong>{displayMother.noOfChildren ?? "-"}</strong></p>
          </div>
        </div>

        <div className="profile-panel">
          <h3>EPDS Score Trend</h3>
          <EpdsTrendChart
            history={displayMother.epdsHistory}
            fallbackScore={displayMother.lastEpdScore}
            fallbackSubmittedAt={displayMother.lastEpdTestDate}
          />
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
    </div>,
    document.body,
  );
}
