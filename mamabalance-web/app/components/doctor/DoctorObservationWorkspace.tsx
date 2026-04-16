"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, Eye, FileText, Pencil, Search } from "lucide-react";

import Pagination from "@/app/superadmin/components/Pagination";
import LoadingState from "@/components/admin/LoadingState";
import type { MidwifeMotherRecord } from "@/lib/midwife/types";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/doctor/styles/MedicalObservation.css";

type Source = "doctor" | "homeVisit" | "clinicVisit";
type DateRange = "All" | "Week" | "Month";
type RiskLevel = "Low" | "Moderate" | "High";
type Mood = "Normal" | "Anxious" | "Depressed" | "Angry";
type Sleep = "Good" | "Moderate" | "Poor";
type Appetite = "Good" | "Reduced" | "Increased";

type DoctorMotherRecord = MidwifeMotherRecord;

export type ObservationRecord = {
  id: string;
  source: Source;
  motherUid: string;
  motherName: string;
  motherUsername: string;
  timestamp: string;
  observedAt: string;
  title: string;
  note: string;
  riskLevel: RiskLevel;
  mood: Mood;
  sleep: Sleep;
  appetite: Appetite;
  additional: string;
  upcomingCheckup: string;
  observedBy: string;
};

type ObservationFormState = {
  motherQuery: string;
  title: string;
  note: string;
  mood: Mood;
  sleep: Sleep;
  appetite: Appetite;
  additional: string;
  upcomingCheckup: string;
};

const EMPTY_FORM: ObservationFormState = {
  motherQuery: "",
  title: "",
  note: "",
  mood: "Normal",
  sleep: "Moderate",
  appetite: "Good",
  additional: "",
  upcomingCheckup: "",
};

function toDateTimeLocalValue(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function findMother(query: string, mothers: DoctorMotherRecord[]) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return null;

  return (
    mothers.find(
      (mother) =>
        mother.name.toLowerCase() === normalized ||
        mother.username.toLowerCase() === normalized ||
        mother.userId.toLowerCase() === normalized,
    ) ||
    mothers.find(
      (mother) =>
        mother.name.toLowerCase().includes(normalized) ||
        mother.username.toLowerCase().includes(normalized) ||
        mother.userId.toLowerCase().includes(normalized),
    ) ||
    null
  );
}

export default function DoctorObservationWorkspace() {
  const [mothersLoading, setMothersLoading] = useState(true);
  const [mothersError, setMothersError] = useState("");
  const [mothers, setMothers] = useState<DoctorMotherRecord[]>([]);

  const loadMothers = useCallback(async () => {
    setMothersLoading(true);
    setMothersError("");
    try {
      const response = await fetch("/api/doctor/mothers", { cache: "no-store" });
      const payload = (await response.json()) as { mothers?: DoctorMotherRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load mothers.");
      setMothers(payload.mothers || []);
    } catch (err) {
      setMothersError(err instanceof Error ? err.message : "Failed to load mothers.");
    } finally {
      setMothersLoading(false);
    }
  }, []);

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Source>("doctor");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [dateRange, setDateRange] = useState<DateRange>("All");
  const [rows, setRows] = useState<ObservationRecord[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [showView, setShowView] = useState<ObservationRecord | null>(null);
  const [showEdit, setShowEdit] = useState<ObservationRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ObservationFormState>(EMPTY_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const dateRef = useRef<HTMLInputElement>(null);
  const currentDate = useMemo(() => new Date(), []);
  const itemsPerPage = 6;

  const loadObservations = useCallback(async () => {
    setIsLoadingRows(true);
    setError("");

    try {
      const response = await fetch("/api/doctor/observations", { cache: "no-store" });
      const payload = (await response.json()) as {
        observations?: ObservationRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load observations.");
      }

      setRows(payload.observations || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load observations.",
      );
    } finally {
      setIsLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    void loadMothers();
    void loadObservations();
  }, [loadMothers, loadObservations]);

  const matchedMother = useMemo(
    () => findMother(form.motherQuery, mothers),
    [form.motherQuery, mothers],
  );

  const currentRows = useMemo(
    () => rows.filter((row) => row.source === activeTab),
    [activeTab, rows],
  );

  const filteredRows = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return currentRows.filter((row) => {
      const observedAt = new Date(row.observedAt);
      const diffDays =
        (currentDate.getTime() - observedAt.getTime()) / (1000 * 60 * 60 * 24);
      const matchesRange =
        dateRange === "All" ||
        (dateRange === "Week" && diffDays <= 7) ||
        (dateRange === "Month" && diffDays <= 30);
      const matchesSearch = `${row.motherName} ${row.motherUsername} ${row.title} ${row.note} ${row.additional}`
        .toLowerCase()
        .includes(search);

      return matchesRange && matchesSearch;
    });
  }, [currentDate, currentRows, dateRange, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  
  const hasActiveSearchOrFilter = searchTerm.trim().length > 0 || dateRange !== "All";

  const openDatePicker = () => {
    if (!dateRef.current) return;
    dateRef.current.showPicker?.();
    dateRef.current.focus();
    dateRef.current.click();
  };

  const closeEditor = () => {
    setShowAdd(false);
    setShowEdit(null);
    setForm(EMPTY_FORM);
    setIsSaving(false);
  };

  const openEdit = (row: ObservationRecord) => {
    setShowEdit(row);
    setForm({
      motherQuery: row.motherUsername,
      title: row.title,
      note: row.note,
      mood: row.mood,
      sleep: row.sleep,
      appetite: row.appetite,
      additional: row.additional === "-" ? "" : row.additional,
      upcomingCheckup: toDateTimeLocalValue(row.upcomingCheckup),
    });
  };

  const saveObservation = async (mode: "add" | "edit") => {
    if (!matchedMother || !form.title.trim() || !form.note.trim() || !form.upcomingCheckup) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch("/api/doctor/observations", {
        method: mode === "add" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showEdit?.id,
          motherUid: matchedMother.uid,
          source: mode === "add" ? activeTab : showEdit?.source,
          title: form.title,
          note: form.note,
          mood: form.mood,
          sleep: form.sleep,
          appetite: form.appetite,
          additional: form.additional,
          upcomingCheckup: form.upcomingCheckup,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save the observation.");
      }

      await loadObservations();
      closeEditor();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the observation.",
      );
      setIsSaving(false);
    }
  };

  const isInitialLoading = mothersLoading || isLoadingRows;

  return (
    <div className="medical-observation-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Medical Observations</h1>
          <p>Record and review doctor, home visit, and clinic visit observations for assigned mothers.</p>
        </div>
        {activeTab === "doctor" && (
          <button className="add-observation-btn" onClick={() => setShowAdd(true)}>
            + Add New Observation
          </button>
        )}
      </div>

      <div className="observation-toolbar">
        <div className="search-box observation-search">
          <Search size={18} />
          <input
            placeholder="Search mothers, titles, notes, or tags"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="observation-filter-wrap">
          <div className="filter-select observation-filter">
            <select
              value={dateRange}
              onChange={(event) => {
                setDateRange(event.target.value as DateRange);
                setCurrentPage(1);
              }}
            >
              <option value="All">Date Range : All</option>
              <option value="Week">Date Range : Week</option>
              <option value="Month">Date Range : Month</option>
            </select>
            <span className="filter-select-icon" aria-hidden="true">
              <ChevronDown size={18} strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>

      <div className="observation-tabs">
        <button className={`observation-tab ${activeTab === "doctor" ? "active" : ""}`} onClick={() => { setActiveTab("doctor"); setCurrentPage(1); }}>
          Doctor&apos;s Observation
        </button>
        <button className={`observation-tab ${activeTab === "homeVisit" ? "active" : ""}`} onClick={() => { setActiveTab("homeVisit"); setCurrentPage(1); }}>
          Home Visits
        </button>
        <button className={`observation-tab ${activeTab === "clinicVisit" ? "active" : ""}`} onClick={() => { setActiveTab("clinicVisit"); setCurrentPage(1); }}>
          Clinic Visits
        </button>
      </div>

      {isInitialLoading ? (
        <LoadingState label="Loading observations..." />
      ) : error || mothersError ? (
        <LoadingState label={error || mothersError} variant="error" />
      ) : (
        <>
          <div className="observation-table-card">
            {paginatedRows.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  {hasActiveSearchOrFilter ? (
                    <Search size={26} strokeWidth={2.2} />
                  ) : (
                    <FileText size={26} strokeWidth={2.2} />
                  )}
                </div>
                <h3>
                  {hasActiveSearchOrFilter
                    ? "No matching observations found"
                    : `No ${activeTab === "doctor" ? "doctor" : activeTab === "homeVisit" ? "home" : "clinic"} visit observations yet`}
                </h3>
                <p>
                  {hasActiveSearchOrFilter
                    ? "Try a different mother name, title, note keyword, or clear the current filters."
                    : `Observation records for ${activeTab === "doctor" ? "doctor" : activeTab === "homeVisit" ? "home" : "clinic"} visits will appear here once they are added.`}
                </p>
                <div className="doctor-empty-state-tips">
                  {hasActiveSearchOrFilter ? (
                    <>
                      <span>Check spelling</span>
                      <span>Try fewer keywords</span>
                      <span>Clear filters</span>
                    </>
                  ) : (
                    <>
                      <span>Observation summary</span>
                      <span>Mother wellbeing notes</span>
                      <span>Next follow-up date</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Risk Level</th>
                    <th>Observation Title</th>
                    <th>Mood</th>
                    <th>Sleep</th>
                    <th>Appetite</th>
                    <th>Additional</th>
                    <th>Next Observation Date</th>
                    <th>Observed By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.timestamp}</td>
                      <td>{row.motherName}</td>
                      <td>{row.motherUsername}</td>
                      <td><span className={`table-risk-badge ${row.riskLevel.toLowerCase()}`}>{row.riskLevel}</span></td>
                      <td className="observation-title-cell">{row.title}</td>
                      <td>{row.mood}</td>
                      <td>{row.sleep}</td>
                      <td>{row.appetite}</td>
                      <td>{row.additional}</td>
                      <td>{row.upcomingCheckup}</td>
                      <td>{row.observedBy}</td>
                      <td className="observation-action-cell">
                        <button className="icon-btn view" onClick={() => setShowView(row)}><Eye size={18} /></button>
                        {activeTab === "doctor" && (
                          <button className="icon-btn edit" onClick={() => openEdit(row)}><Pencil size={18} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredRows.length > 0 && (
            <Pagination currentPage={safeCurrentPage} totalItems={filteredRows.length} pageSize={itemsPerPage} onPageChange={setCurrentPage} />
          )}
        </>
      )}

      {(showAdd || showEdit) && (
        <div className="modal-overlay">
          <div className="modal-card observation-modal observation-modal-large">
            <h2 className="modal-title">
              {showEdit ? "UPDATE DOCTOR OBSERVATION" : "ADD DOCTOR OBSERVATION"}
            </h2>
            <div className="observation-modal-grid">
              <div>
                <label>Mother (name, username, or user ID)</label>
                <input value={form.motherQuery} onChange={(event) => setForm((current) => ({ ...current, motherQuery: event.target.value }))} placeholder="Search assigned mother" />

                <div className="matched-mother-inline">
                  {matchedMother ? (
                    <div className="selected-mother-box">
                      <p><strong>Name:</strong> {matchedMother.name}</p>
                      <p><strong>Username:</strong> {matchedMother.username}</p>
                      <p><strong>Risk:</strong> <span className={`table-risk-badge ${matchedMother.risk.toLowerCase()}`}>{matchedMother.risk === "high" ? "High" : matchedMother.risk === "moderate" ? "Moderate" : "Low"}</span></p>
                    </div>
                  ) : (
                    <span className="matched-mother-text">Start typing a mother&apos;s name, username, or user ID.</span>
                  )}
                </div>

                <label>Observation Title</label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />

                <label>Detailed Notes</label>
                <textarea rows={5} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
              </div>

              <div className="right-stack">
                <div>
                  <label>Mood</label>
                  <div className="modal-input-icon">
                    <select value={form.mood} onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value as Mood }))}>
                      <option>Normal</option>
                      <option>Anxious</option>
                      <option>Depressed</option>
                      <option>Angry</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}><ChevronDown size={18} /></button>
                  </div>
                </div>

                <div>
                  <label>Sleep</label>
                  <div className="modal-input-icon">
                    <select value={form.sleep} onChange={(event) => setForm((current) => ({ ...current, sleep: event.target.value as Sleep }))}>
                      <option>Good</option>
                      <option>Moderate</option>
                      <option>Poor</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}><ChevronDown size={18} /></button>
                  </div>
                </div>

                <div>
                  <label>Appetite</label>
                  <div className="modal-input-icon">
                    <select value={form.appetite} onChange={(event) => setForm((current) => ({ ...current, appetite: event.target.value as Appetite }))}>
                      <option>Good</option>
                      <option>Reduced</option>
                      <option>Increased</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}><ChevronDown size={18} /></button>
                  </div>
                </div>

                <div>
                  <label>Next Observation Date</label>
                  <div className="modal-input-icon">
                    <input ref={dateRef} type="datetime-local" value={form.upcomingCheckup} onChange={(event) => setForm((current) => ({ ...current, upcomingCheckup: event.target.value }))} />
                    <button type="button" className="modal-icon-trigger" onClick={openDatePicker} aria-label="Open date picker"><CalendarDays size={18} /></button>
                  </div>
                </div>

                <div>
                  <label>Additional Tag</label>
                  <input value={form.additional} onChange={(event) => setForm((current) => ({ ...current, additional: event.target.value }))} placeholder="Ex: Need EPDS review" />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={closeEditor}>Cancel</button>
              <button className="btn-primary" onClick={() => void saveObservation(showEdit ? "edit" : "add")} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showView && (
        <div className="modal-overlay">
          <div className="modal-card observation-view-modal">
            <div className="observation-view-hero">
              <div>
                <p className="observation-view-kicker">{showView.source === "doctor" ? "Doctor's Observation" : showView.source === "homeVisit" ? "Home Visit Observation" : "Clinic Visit Observation"}</p>
                <h2 className="modal-title">{showView.title}</h2>
                <p className="observation-view-subtitle">{showView.motherName} ({showView.motherUsername})</p>
              </div>
              <span className={`table-risk-badge ${showView.riskLevel.toLowerCase()}`}>{showView.riskLevel}</span>
            </div>

            <div className="observation-view-grid">
              <div className="observation-view-card">
                <h3>Observation Summary</h3>
                <div className="view-field"><span>Recorded on</span><strong>{showView.timestamp}</strong></div>
                <div className="view-field"><span>Next observation date</span><strong>{showView.upcomingCheckup}</strong></div>
                <div className="view-field"><span>Additional tag</span><strong>{showView.additional}</strong></div>
                <div className="view-field"><span>Observed By</span><strong>{showView.observedBy}</strong></div>
              </div>

              <div className="observation-view-card">
                <h3>Wellbeing Snapshot</h3>
                <div className="view-triple-grid">
                  <div className="view-pill-block"><span>Mood</span><strong>{showView.mood}</strong></div>
                  <div className="view-pill-block"><span>Sleep</span><strong>{showView.sleep}</strong></div>
                  <div className="view-pill-block"><span>Appetite</span><strong>{showView.appetite}</strong></div>
                </div>
              </div>
            </div>

            <div className="observation-notes-panel">
              <h3>Detailed Notes</h3>
              <p>{showView.note}</p>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
