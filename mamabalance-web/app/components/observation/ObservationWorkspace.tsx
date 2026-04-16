"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { CalendarDays, ChevronDown, Eye, Pencil, Search } from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/doctor/styles/MedicalObservation.css";

type Role = "doctor" | "midwife";
type DateRange = "All" | "Week" | "Month";
type Source = "doctor" | "homeVisit" | "clinicVisit";
type RiskLevel = "Low" | "Moderate" | "High";
type Mood = "Normal" | "Anxious" | "Depressed" | "Angry";
type Sleep = "Good" | "Moderate" | "Poor";
type Appetite = "Good" | "Reduced" | "Increased";

type MotherProfile = {
  name: string;
  username: string;
  riskLevel: RiskLevel;
};

type Observation = {
  id: number;
  motherName: string;
  motherUsername: string;
  timestamp: string;
  observedAt: Date;
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

type FormState = {
  motherQuery: string;
  title: string;
  note: string;
  mood: Mood;
  sleep: Sleep;
  appetite: Appetite;
  additional: string;
  upcomingCheckup: string;
};

const MOTHERS: MotherProfile[] = [
  { name: "Ayeshi Silva", username: "ayeshi01", riskLevel: "High" },
  { name: "Ayesha Perera", username: "ayesha02", riskLevel: "Moderate" },
  { name: "Dinali Silva", username: "dinali03", riskLevel: "High" },
  { name: "Tharushi Nimal", username: "tharushi04", riskLevel: "Moderate" },
  { name: "Anudi Ekanayake", username: "anudi05", riskLevel: "Low" },
];

const DOCTOR_OBSERVATIONS: Observation[] = [
  {
    id: 1,
    motherName: "Ayeshi Silva",
    motherUsername: "ayeshi01",
    timestamp: "2026-04-03 09:15 AM",
    observedAt: new Date("2026-04-03T09:15:00"),
    title: "Severe Anxiety Episode",
    note: "Mother expressed persistent sadness and anxiety. EPDS score was 18.",
    riskLevel: "High",
    mood: "Anxious",
    sleep: "Poor",
    appetite: "Good",
    additional: "Follow-up needed",
    upcomingCheckup: "2026-04-10 10:30 AM",
    observedBy: "Dr. Nipuni Kaushalya",
  },
  {
    id: 2,
    motherName: "Dinali Silva",
    motherUsername: "dinali03",
    timestamp: "2026-04-02 11:00 AM",
    observedAt: new Date("2026-04-02T11:00:00"),
    title: "Depressive Symptoms Review",
    note: "Low mood with reduced appetite and poor sleep noted.",
    riskLevel: "High",
    mood: "Depressed",
    sleep: "Poor",
    appetite: "Reduced",
    additional: "Family support advised",
    upcomingCheckup: "2026-04-08 02:00 PM",
    observedBy: "Dr. Nipuni Kaushalya",
  },
];

const HOME_VISIT_OBSERVATIONS: Observation[] = [
  {
    id: 101,
    motherName: "Ayesha Perera",
    motherUsername: "ayesha02",
    timestamp: "2026-04-06 08:45 AM",
    observedAt: new Date("2026-04-06T08:45:00"),
    title: "Postnatal Home Visit",
    note: "Mother reported tiredness and reduced rest at home.",
    riskLevel: "Moderate",
    mood: "Anxious",
    sleep: "Poor",
    appetite: "Reduced",
    additional: "Home support plan initiated",
    upcomingCheckup: "2026-04-11 09:00 AM",
    observedBy: "Midwife Nadeesha Silva",
  },
];

const CLINIC_VISIT_OBSERVATIONS: Observation[] = [
  {
    id: 201,
    motherName: "Tharushi Nimal",
    motherUsername: "tharushi04",
    timestamp: "2026-04-04 01:00 PM",
    observedAt: new Date("2026-04-04T13:00:00"),
    title: "Clinic Mental Health Screening",
    note: "Mood instability observed. EPDS reassessment planned.",
    riskLevel: "Moderate",
    mood: "Depressed",
    sleep: "Moderate",
    appetite: "Reduced",
    additional: "EPDS reassessment required",
    upcomingCheckup: "2026-04-12 01:00 PM",
    observedBy: "Midwife Nadeesha Silva",
  },
];

const EMPTY_FORM: FormState = {
  motherQuery: "",
  title: "",
  note: "",
  mood: "Normal",
  sleep: "Moderate",
  appetite: "Good",
  additional: "",
  upcomingCheckup: "",
};

function formatDateTime(value: Date) {
  return `${value.toISOString().slice(0, 10)} ${value.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

function toDateInputValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

function findMother(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    MOTHERS.find(
      (mother) =>
        mother.name.toLowerCase() === normalized ||
        mother.username.toLowerCase() === normalized,
    ) ||
    MOTHERS.find(
      (mother) =>
        mother.name.toLowerCase().includes(normalized) ||
        mother.username.toLowerCase().includes(normalized),
    ) ||
    null
  );
}

export default function ObservationWorkspace({ role }: { role: Role }) {
  const [isLoading, setIsLoading] = useState(true);
  const [doctorRows, setDoctorRows] = useState(DOCTOR_OBSERVATIONS);
  const [homeRows, setHomeRows] = useState(HOME_VISIT_OBSERVATIONS);
  const [clinicRows, setClinicRows] = useState(CLINIC_VISIT_OBSERVATIONS);
  const [activeTab, setActiveTab] = useState<Source>("doctor");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("All");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  const [showView, setShowView] = useState<Observation | null>(null);
  const [showEdit, setShowEdit] = useState<Observation | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const checkupDateRef = useRef<HTMLInputElement>(null);

  const currentRows = activeTab === "doctor" ? doctorRows : activeTab === "homeVisit" ? homeRows : clinicRows;
  const canEditCurrentTab = role === "doctor" ? activeTab === "doctor" : activeTab !== "doctor";
  const matchedMother = useMemo(() => findMother(form.motherQuery), [form.motherQuery]);

  const filteredRows = useMemo(() => {
    const now = new Date("2026-04-08T12:00:00");
    const search = searchTerm.toLowerCase();
    return currentRows.filter((row) => {
      const text = `${row.motherName} ${row.motherUsername} ${row.title} ${row.note} ${row.observedBy}`.toLowerCase();
      const diffDays = (now.getTime() - row.observedAt.getTime()) / (1000 * 60 * 60 * 24);
      const rangeOk = dateRange === "All" || (dateRange === "Week" && diffDays <= 7) || (dateRange === "Month" && diffDays <= 30);
      return text.includes(search) && rangeOk;
    });
  }, [currentRows, dateRange, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  const startItem = filteredRows.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, filteredRows.length);

  const updateCurrentRows = (updater: (rows: Observation[]) => Observation[]) => {
    if (activeTab === "doctor") setDoctorRows(updater);
    if (activeTab === "homeVisit") setHomeRows(updater);
    if (activeTab === "clinicVisit") setClinicRows(updater);
  };

  const handleSaveNew = () => {
    if (!matchedMother || !form.title || !form.note || !form.upcomingCheckup) return;
    const observedBy = activeTab === "doctor" ? "Dr. Nipuni Kaushalya" : "Midwife Nadeesha Silva";
    const now = new Date();
    const newItem: Observation = {
      id: Date.now(),
      motherName: matchedMother.name,
      motherUsername: matchedMother.username,
      timestamp: formatDateTime(now),
      observedAt: now,
      title: form.title,
      note: form.note,
      riskLevel: matchedMother.riskLevel,
      mood: form.mood,
      sleep: form.sleep,
      appetite: form.appetite,
      additional: form.additional,
      upcomingCheckup: formatDateTime(new Date(form.upcomingCheckup)),
      observedBy,
    };
    updateCurrentRows((rows) => [newItem, ...rows]);
    setShowAdd(false);
    setForm(EMPTY_FORM);
  };

  const handleSaveEdit = () => {
    if (!showEdit || !matchedMother || !form.title || !form.note || !form.upcomingCheckup) return;
    updateCurrentRows((rows) =>
      rows.map((row) =>
        row.id === showEdit.id
          ? {
              ...row,
              motherName: matchedMother.name,
              motherUsername: matchedMother.username,
              title: form.title,
              note: form.note,
              riskLevel: matchedMother.riskLevel,
              mood: form.mood,
              sleep: form.sleep,
              appetite: form.appetite,
              additional: form.additional,
              upcomingCheckup: formatDateTime(new Date(form.upcomingCheckup)),
            }
          : row,
      ),
    );
    setShowEdit(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (row: Observation) => {
    setShowEdit(row);
    setForm({
      motherQuery: row.motherUsername,
      title: row.title,
      note: row.note,
      mood: row.mood,
      sleep: row.sleep,
      appetite: row.appetite,
      additional: row.additional,
      upcomingCheckup: toDateInputValue(row.upcomingCheckup),
    });
  };

  const openDatePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return;
    inputRef.current.showPicker?.();
    inputRef.current.focus();
    inputRef.current.click();
  };

  return (
    <div className="medical-observation-page">
      <div className="medical-observation-header">
        <h1>Medical Observations</h1>
        {canEditCurrentTab && (
          <button className="add-observation-btn" onClick={() => setShowAdd(true)}>
            + Add New Observation
          </button>
        )}
      </div>

      <div className="observation-toolbar">
        <div className="search-box observation-search">
          <Search size={18} />
          <input placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="observation-filter-wrap">
          <div className="filter-select observation-filter">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}>
              <option value="All">Date Range: All</option>
              <option value="Week">Date Range: Week</option>
              <option value="Month">Date Range: Month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="observation-tabs">
        <button className={`observation-tab ${activeTab === "doctor" ? "active" : ""}`} onClick={() => setActiveTab("doctor")}>Doctor&apos;s Observation</button>
        <button className={`observation-tab ${activeTab === "homeVisit" ? "active" : ""}`} onClick={() => setActiveTab("homeVisit")}>Home Visits</button>
        <button className={`observation-tab ${activeTab === "clinicVisit" ? "active" : ""}`} onClick={() => setActiveTab("clinicVisit")}>Clinic Visits</button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading observations..." />
      ) : (
        <>
          <div className="observation-table-card">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th><th>Name</th><th>Username</th><th>Risk Level</th><th>Observation Title</th><th>Mood</th><th>Sleep</th><th>Appetite</th><th>Additional</th><th>Next Observation Date</th><th>Observed By</th><th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.id}>
                <td>{row.timestamp}</td><td>{row.motherName}</td><td>{row.motherUsername}</td><td><span className={`risk-dot ${row.riskLevel.toLowerCase()}`} />{row.riskLevel}</td><td className="observation-title-cell">{row.title}</td>
                <td>{row.mood}</td><td>{row.sleep}</td><td>{row.appetite}</td><td>{row.additional}</td><td>{row.upcomingCheckup}</td><td>{row.observedBy}</td>
                <td className="observation-action-cell">
                  <button className="icon-btn view" onClick={() => setShowView(row)}><Eye size={18} /></button>
                  {canEditCurrentTab && <button className="icon-btn edit" onClick={() => openEdit(row)}><Pencil size={18} /></button>}
                </td>
              </tr>
            ))}
            {paginatedRows.length === 0 && <tr><td colSpan={12} className="no-observations-cell">No records found for this tab.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination pagination-enhanced">
        <div className="pagination-info">
          Showing {startItem}-{endItem} of {filteredRows.length}
        </div>

        <div className="pagination-controls">
          <button
            className={`page-btn ${safeCurrentPage === 1 ? "disabled" : ""}`}
            disabled={safeCurrentPage === 1}
            onClick={() => safeCurrentPage > 1 && setCurrentPage(safeCurrentPage - 1)}
          >
            Previous
          </button>

          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                className={`page-number ${safeCurrentPage === index + 1 ? "active" : ""}`}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            className={`page-btn ${safeCurrentPage === totalPages ? "disabled" : ""}`}
            disabled={safeCurrentPage === totalPages}
            onClick={() => safeCurrentPage < totalPages && setCurrentPage(safeCurrentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
      </>
      )}

      {(showAdd || showEdit) && (
        <div className="modal-overlay">
          <div className="modal-card observation-modal observation-modal-large">
            <h2 className="modal-title">{showEdit ? "UPDATE OBSERVATION" : "ADD NEW OBSERVATION"}</h2>
            <div className="observation-modal-grid">
              <div>
                <label>Mother (Name or Username)</label>
                <input
                  value={form.motherQuery}
                  onChange={(e) => setForm((f) => ({ ...f, motherQuery: e.target.value }))}
                  placeholder="Type name or username"
                />

                <div className="matched-mother-inline">
                  {matchedMother ? (
                    <div className="selected-mother-box">
                      <p><strong>Name:</strong> {matchedMother.name}</p>
                      <p><strong>Username:</strong> {matchedMother.username}</p>
                      <p>
                        <strong>Risk Status:</strong>{" "}
                        <span className={`risk-pill ${matchedMother.riskLevel.toLowerCase()}`}>
                          {matchedMother.riskLevel}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <span className="matched-mother-text">Enter a mother name or username</span>
                  )}
                </div>
                <label>Observation Title</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                <label>Detailed Notes</label>
                <textarea rows={5} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="right-stack">
                <div>
                  <label>Mood</label>
                  <div className="modal-input-icon">
                    <select value={form.mood} onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value as Mood }))}>
                      <option>Normal</option>
                      <option>Anxious</option>
                      <option>Depressed</option>
                      <option>Angry</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}>
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label>Sleep</label>
                  <div className="modal-input-icon">
                    <select value={form.sleep} onChange={(e) => setForm((f) => ({ ...f, sleep: e.target.value as Sleep }))}>
                      <option>Good</option>
                      <option>Moderate</option>
                      <option>Poor</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}>
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label>Appetite</label>
                  <div className="modal-input-icon">
                    <select value={form.appetite} onChange={(e) => setForm((f) => ({ ...f, appetite: e.target.value as Appetite }))}>
                      <option>Good</option>
                      <option>Reduced</option>
                      <option>Increased</option>
                    </select>
                    <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}>
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label>Next Observation Date</label>
                  <div className="modal-input-icon">
                    <input
                      ref={checkupDateRef}
                      type="datetime-local"
                      value={form.upcomingCheckup}
                      onChange={(e) => setForm((f) => ({ ...f, upcomingCheckup: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="modal-icon-trigger"
                      onClick={() => openDatePicker(checkupDateRef)}
                      aria-label="Open date picker"
                    >
                      <CalendarDays size={18} />
                    </button>
                  </div>
                </div>

                <div><label>Additional Tag</label><input value={form.additional} onChange={(e) => setForm((f) => ({ ...f, additional: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => { setShowAdd(false); setShowEdit(null); setForm(EMPTY_FORM); }}>Cancel</button>
              <button className="btn-primary" onClick={showEdit ? handleSaveEdit : handleSaveNew}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showView && (
        <div className="modal-overlay">
          <div className="modal-card observation-modal observation-modal-view">
            <h2 className="modal-title">VIEW OBSERVATION</h2>
            <div className="view-details observation-view-details">
              <div className="detail-row"><span className="detail-label">Timestamp</span><span className="detail-value">{showView.timestamp}</span></div>
              <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{showView.motherName}</span></div>
              <div className="detail-row"><span className="detail-label">Username</span><span className="detail-value">{showView.motherUsername}</span></div>
              <div className="detail-row">
                <span className="detail-label">Risk Level</span>
                <span className={`risk-pill ${showView.riskLevel.toLowerCase()}`}>{showView.riskLevel}</span>
              </div>
              <div className="detail-row"><span className="detail-label">Observation Title</span><span className="detail-value">{showView.title}</span></div>
              <div className="detail-row"><span className="detail-label">Detailed Notes</span><span className="detail-value detail-multiline">{showView.note}</span></div>
              <div className="detail-row"><span className="detail-label">Next Observation Date</span><span className="detail-value">{showView.upcomingCheckup}</span></div>
              <div className="detail-row"><span className="detail-label">Mood</span><span className="detail-value">{showView.mood}</span></div>
              <div className="detail-row"><span className="detail-label">Sleep</span><span className="detail-value">{showView.sleep}</span></div>
              <div className="detail-row"><span className="detail-label">Appetite</span><span className="detail-value">{showView.appetite}</span></div>
              <div className="detail-row"><span className="detail-label">Additional Tag</span><span className="detail-value">{showView.additional}</span></div>
              <div className="detail-row"><span className="detail-label">Observed By</span><span className="detail-value">{showView.observedBy}</span></div>
            </div>
            <div className="modal-actions"><button className="btn-outline" onClick={() => setShowView(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
