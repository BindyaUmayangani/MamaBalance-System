"use client";

import { useEffect, useMemo, useState } from "react";

import type { ManagedMotherRow } from "@/lib/admin/types";
import "@/app/doctor/styles/AssignedMothers.css";

type ObservationSource = "doctor" | "homeVisit" | "clinicVisit";

type ObservationEntry = {
  id?: string;
  source?: ObservationSource;
  timestamp: string;
  observedAt?: string;
  title: string;
  detailedNote: string;
  mood: string;
  sleep: string;
  appetite: string;
  nextObservationDate: string;
  observedBy: string;
};

type MedicationEntry = {
  id?: string;
  name: string;
  dosage: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  status?: "Active" | "Completed" | "Stopped";
  notes?: string;
  instructions?: string;
  reasonStopped?: string;
};

type MotherCareDetails = ManagedMotherRow & {
  observations?: ObservationEntry[];
  activeMedications?: MedicationEntry[];
  medicationHistory?: MedicationEntry[];
};

type Props = {
  mother: ManagedMotherRow;
  onClose: () => void;
};

const observationItemsPerPage = 3;
const medicationItemsPerPage = 1;

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

function formatDosage(value: string) {
  return value ? value.replace(/mg/gi, "").trim() : "";
}

function getObservationSource(entry: ObservationEntry) {
  if (entry.source) {
    return entry.source;
  }

  const searchableText = `${entry.title} ${entry.observedBy}`.toLowerCase();
  if (searchableText.includes("doctor") || searchableText.includes("dr.")) {
    return "doctor";
  }
  if (searchableText.includes("clinic")) {
    return "clinicVisit";
  }

  return "homeVisit";
}

export default function MotherObservationModal({ mother, onClose }: Props) {
  const [details, setDetails] = useState<MotherCareDetails>(mother);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [observationFilter, setObservationFilter] = useState("all");
  const [observationPage, setObservationPage] = useState(1);
  const [activeMedicationPage, setActiveMedicationPage] = useState(1);
  const [medicationHistoryPage, setMedicationHistoryPage] = useState(1);
  const observations = useMemo(() => details.observations || [], [details.observations]);
  const activeMedications = useMemo(
    () => details.activeMedications || [],
    [details.activeMedications],
  );
  const medicationHistory = useMemo(
    () => details.medicationHistory || [],
    [details.medicationHistory],
  );
  const motherRiskClass = riskClass(details.riskStatus);

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      try {
        setIsLoadingDetails(true);
        setDetailError("");

        const response = await fetch(`/api/admin/mothers/${encodeURIComponent(mother.uid)}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as MotherCareDetails & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load observation details.");
        }

        if (isMounted) {
          setDetails(payload);
        }
      } catch (caughtError) {
        if (isMounted) {
          setDetailError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load observation details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      }
    }

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [mother.uid]);

  const filteredObservationEntries = useMemo(
    () =>
      observations.filter((entry) =>
        observationFilter === "all"
          ? true
          : getObservationSource(entry) === observationFilter,
      ),
    [observationFilter, observations],
  );

  const selectedObservationEntries = filteredObservationEntries.slice(
    (observationPage - 1) * observationItemsPerPage,
    observationPage * observationItemsPerPage,
  );
  const selectedActiveMedications = activeMedications.slice(
    (activeMedicationPage - 1) * medicationItemsPerPage,
    activeMedicationPage * medicationItemsPerPage,
  );
  const selectedMedicationHistory = medicationHistory.slice(
    (medicationHistoryPage - 1) * medicationItemsPerPage,
    medicationHistoryPage * medicationItemsPerPage,
  );
  const observationTotalPages = Math.max(
    1,
    Math.ceil(filteredObservationEntries.length / observationItemsPerPage),
  );
  const activeMedicationTotalPages = Math.max(
    1,
    Math.ceil(activeMedications.length / medicationItemsPerPage),
  );
  const medicationHistoryTotalPages = Math.max(
    1,
    Math.ceil(medicationHistory.length / medicationItemsPerPage),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card mother-observation-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-banner compact">
          <div>
            <h2>{details.name} Overview</h2>
            {isLoadingDetails ? <p className="profile-load-note">Refreshing from database...</p> : null}
            {detailError ? <p className="profile-error-note">{detailError}</p> : null}
          </div>
          <span className={`profile-risk-badge ${motherRiskClass}`}>
            {riskLabel(details.riskStatus)}
          </span>
        </div>

        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>Observation Timeline</h3>
            <select
              value={observationFilter}
              onChange={(event) => {
                setObservationFilter(event.target.value);
                setObservationPage(1);
              }}
              className="internal-modal-select admin-observation-filter"
            >
              <option value="all">All Sources</option>
              <option value="doctor">Doctor&apos;s Observation</option>
              <option value="homeVisit">Home Visit</option>
              <option value="clinicVisit">Clinic Visit</option>
            </select>
          </div>

          <div className="observation-table-shell">
            <table className="timeline-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Title</th>
                  <th>Mood</th>
                  <th>Sleep</th>
                  <th>Appetite</th>
                  <th>Next Observation</th>
                  <th>Observed By</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingDetails ? (
                  <tr>
                    <td colSpan={7} className="empty-inline-state">
                      Loading observations...
                    </td>
                  </tr>
                ) : (
                  selectedObservationEntries.map((entry) => (
                    <tr key={entry.id || entry.timestamp}>
                      <td>{entry.timestamp}</td>
                      <td>{entry.title}</td>
                      <td>{entry.mood}</td>
                      <td>{entry.sleep}</td>
                      <td>{entry.appetite}</td>
                      <td>{entry.nextObservationDate}</td>
                      <td>{entry.observedBy}</td>
                    </tr>
                  ))
                )}
                {!isLoadingDetails && selectedObservationEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-inline-state">
                      No observations found for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="inline-pagination">
            <button
              className={`pager-btn ${observationPage === 1 ? "disabled" : ""}`}
              onClick={() => observationPage > 1 && setObservationPage(observationPage - 1)}
              type="button"
            >
              &lt;
            </button>
            <span className="pager-indicator">{observationPage}</span>
            <button
              className={`pager-btn ${observationPage === observationTotalPages ? "disabled" : ""}`}
              onClick={() =>
                observationPage < observationTotalPages &&
                setObservationPage(observationPage + 1)
              }
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>Medication</h3>
          </div>

          <div className="medication-panels">
            <div className="medication-panel active-medication-panel">
              <h4>
                Active Medications{" "}
                <span className="medication-count-chip">{activeMedications.length}</span>
              </h4>
              {isLoadingDetails ? (
                <div className="medication-copy medication-card">Loading medications...</div>
              ) : selectedActiveMedications.length > 0 ? (
                selectedActiveMedications.map((medication) => (
                  <div key={medication.id || medication.name} className="medication-copy medication-card">
                    <p><span>Medication Name:</span> {medication.name || "-"}</p>
                    <p><span>Dosage:</span> {formatDosage(medication.dosage) || "-"} mg</p>
                    <p><span>Frequency:</span> {medication.frequency || "-"}</p>
                    <p><span>Start Date:</span> {medication.startDate || "-"}</p>
                    <p><span>End Date:</span> {medication.endDate || "-"}</p>
                    <p><span>Prescribed by:</span> {medication.prescribedBy || "-"}</p>
                    <p><span>Notes:</span> {medication.notes || "-"}</p>
                    <p><span>Instructions:</span> {medication.instructions || "-"}</p>
                  </div>
                ))
              ) : (
                <div className="medication-copy medication-card">
                  No active medications currently noted.
                </div>
              )}

              {!isLoadingDetails && activeMedications.length > 0 ? (
                <div className="inline-pagination centered">
                  <button
                    className={`pager-btn ${activeMedicationPage === 1 ? "disabled" : ""}`}
                    onClick={() =>
                      activeMedicationPage > 1 &&
                      setActiveMedicationPage(activeMedicationPage - 1)
                    }
                    type="button"
                  >
                    &lt;
                  </button>
                  <span className="pager-indicator">{activeMedicationPage}</span>
                  <button
                    className={`pager-btn ${activeMedicationPage === activeMedicationTotalPages ? "disabled" : ""
                      }`}
                    onClick={() =>
                      activeMedicationPage < activeMedicationTotalPages &&
                      setActiveMedicationPage(activeMedicationPage + 1)
                    }
                    type="button"
                  >
                    &gt;
                  </button>
                </div>
              ) : null}
            </div>

            <div className="medication-panel history-medication-panel">
              <h4>
                Medication History{" "}
                <span className="medication-count-chip ghost">{medicationHistory.length}</span>
              </h4>
              {isLoadingDetails ? (
                <div className="medication-copy medication-card history">
                  Loading medication history...
                </div>
              ) : selectedMedicationHistory.length > 0 ? (
                selectedMedicationHistory.map((medication) => (
                  <div
                    key={medication.id || `${medication.name}-${medication.startDate}`}
                    className="medication-copy medication-card history"
                  >
                    <p><span>Medication Name:</span> {medication.name || "-"}</p>
                    <p><span>Dosage:</span> {formatDosage(medication.dosage) || "-"} mg</p>
                    <p><span>Start Date:</span> {medication.startDate || "-"}</p>
                    <p><span>End Date:</span> {medication.endDate || "-"}</p>
                    <p><span>Prescribed by:</span> {medication.prescribedBy || "-"}</p>
                    <p><span>Reason Stopped:</span> {medication.reasonStopped || "-"}</p>
                  </div>
                ))
              ) : (
                <div className="medication-copy medication-card history">
                  No medication history found.
                </div>
              )}

              {!isLoadingDetails && medicationHistory.length > 0 ? (
                <div className="inline-pagination centered">
                  <button
                    className={`pager-btn ${medicationHistoryPage === 1 ? "disabled" : ""}`}
                    onClick={() =>
                      medicationHistoryPage > 1 &&
                      setMedicationHistoryPage(medicationHistoryPage - 1)
                    }
                    type="button"
                  >
                    &lt;
                  </button>
                  <span className="pager-indicator">{medicationHistoryPage}</span>
                  <button
                    className={`pager-btn ${medicationHistoryPage === medicationHistoryTotalPages ? "disabled" : ""
                      }`}
                    onClick={() =>
                      medicationHistoryPage < medicationHistoryTotalPages &&
                      setMedicationHistoryPage(medicationHistoryPage + 1)
                    }
                    type="button"
                  >
                    &gt;
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
