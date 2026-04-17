"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import "@/app/doctor/styles/MedicationManagement.css";
import MedicationManagementWorkspace from "@/app/components/doctor/MedicationManagementWorkspace";

function LegacyMedicationManagement() {
  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const medicationHistory = [
    {
      name: "Sertraline",
      dosage: "25mg daily",
      startDate: "2025-06-07",
      endDate: "2025-07-10",
      reasonStopped: "Mood stabilized",
    },
    {
      name: "Escitalopram",
      dosage: "10mg daily",
      startDate: "2025-04-14",
      endDate: "2025-06-02",
      reasonStopped: "Shifted to alternative treatment plan",
    },
    {
      name: "Olanzapine",
      dosage: "5mg at night",
      startDate: "2025-02-08",
      endDate: "2025-04-10",
      reasonStopped: "Sleep pattern improved",
    },
    {
      name: "Lorazepam",
      dosage: "1mg when required",
      startDate: "2024-12-18",
      endDate: "2025-01-20",
      reasonStopped: "Short-term anxiety support completed",
    },
  ];

  const scrollHistory = (direction: "left" | "right") => {
    if (!historyScrollRef.current) return;

    const scrollAmount = historyScrollRef.current.clientWidth;
    historyScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="medication-page">
      {/* HEADER */}
      <div className="med-header">
        <h1>Medication Management</h1>

        <button className="add-btn" onClick={() => setShowAdd(true)}>
          + Add New Medication
        </button>
      </div>

      {/* SEARCH */}
      <div className="search-box">
        <Search size={18} />
        <input placeholder="Search by medication, mother, or prescription ID" />
      </div>

      <p className="mother-name">
        Mother’s Name: <strong>Ayeshi Silva</strong>
      </p>

      {/* MAIN CARD */}
      <div className="med-card">
        {/* ACTIVE MEDICATION */}
        <div className="active-card">
          <div className="active-card-header">
            <div>
              <span className="active-badge">Currently Active</span>
              <h3 className="section-title active-title">Active Medications</h3>
              <p className="active-subtitle">
                Ongoing prescription details and care instructions for the current treatment.
              </p>
            </div>
          </div>

          <div className="med-grid active-med-grid">
            <div>
              <span className="label">Medication Name</span>
              <p className="value active-med-name">Fluoxetine</p>
            </div>

            <div>
              <span className="label">Dosage</span>
              <p className="value">10mg daily</p>
            </div>

            <div>
              <span className="label">Start Date</span>
              <p className="value">2025-07-10</p>
            </div>

            <div>
              <span className="label">Prescribed by</span>
              <p className="value">Nipuni Harshika</p>
            </div>
          </div>

          <div className="active-details-grid">
            <div className="med-block active-info-panel">
              <span className="label">Notes</span>
              <ul className="bullet-list">
                <li>Take 1 tablet daily in the morning after food</li>
                <li>Do not miss doses</li>
                <li>Continue for 4 weeks</li>
              </ul>
            </div>

            <div className="med-block active-info-panel">
              <span className="label">Instructions</span>
              <ul className="bullet-list">
                <li>Mild side effects may occur</li>
                <li>Avoid alcohol</li>
              </ul>
            </div>
          </div>

          <div className="action-row">
            <button className="btn-edit" onClick={() => setShowUpdate(true)}>
              Edit
            </button>
            <button className="btn-stop" onClick={() => setShowStop(true)}>
              Stop
            </button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="history-card">
          <div className="history-header">
            <div>
              <h3 className="section-title">Medication History</h3>
              <p className="history-subtitle">
                Review all recent medications prescribed for this mother.
              </p>
            </div>

            <div className="history-nav">
              <button
                type="button"
                className="history-nav-btn"
                aria-label="Scroll medication history left"
                onClick={() => scrollHistory("left")}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="history-nav-btn"
                aria-label="Scroll medication history right"
                onClick={() => scrollHistory("right")}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="history-scroll" ref={historyScrollRef}>
            {medicationHistory.map((medication) => (
              <article className="history-item" key={`${medication.name}-${medication.startDate}`}>
                <div className="history-item-header">
                  <span className="history-badge">Recent</span>
                  <h4>{medication.name}</h4>
                </div>

                <div className="history-item-grid">
                  <div>
                    <span className="label">Dosage</span>
                    <p className="value">{medication.dosage}</p>
                  </div>
                  <div>
                    <span className="label">Start Date</span>
                    <p className="value">{medication.startDate}</p>
                  </div>
                  <div>
                    <span className="label">End Date</span>
                    <p className="value">{medication.endDate}</p>
                  </div>
                  <div>
                    <span className="label">Reason Stopped</span>
                    <p className="value">{medication.reasonStopped}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* ================= ADD MODAL ================= */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card medication-modal medication-modal-large">
            <h2 className="modal-title">ADD NEW MEDICATION</h2>

            <div className="modal-form-grid">
              <div>
                <label>Medication Name</label>
                <input />
              </div>

              <div>
                <label>Dosage</label>
                <input />
              </div>

              <div className="form-span-2">
                <label>Notes</label>
                <textarea />
              </div>

              <div className="form-span-2">
                <label>Instructions</label>
                <textarea />
              </div>

              <div>
                <label>Start Date</label>
                <input type="date" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= UPDATE MODAL ================= */}
      {showUpdate && (
        <div className="modal-overlay">
          <div className="modal-card medication-modal">
            <h2 className="modal-title">UPDATE MEDICATION</h2>

            <label>
              <strong>Medication Name:</strong> Fluoxetine
            </label>

            <label>Dosage</label>
            <input />

            <label>Notes</label>
            <textarea />

            <label>Instructions</label>
            <textarea />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowUpdate(false)}>
                Cancel
              </button>
              <button className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STOP MODAL ================= */}
      {showStop && (
        <div className="modal-overlay">
          <div className="modal-card medication-modal medication-modal-small">
            <h2 className="modal-title danger">STOP MEDICATION</h2>

            <label>Reason to stop medication</label>
            <input />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowStop(false)}>
                Cancel
              </button>
              <button className="btn-primary">Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicationManagement() {
  return <MedicationManagementWorkspace />;
}
