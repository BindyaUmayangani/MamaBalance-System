"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, Search, Trash2 } from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/midwife/styles/UpcomingVisits.css";

type VisitType = "home" | "clinic";
type RiskLevel = "Low" | "Moderate" | "High";
type VisitStatus = "Overdue" | "Upcoming" | "Rescheduled" | "Completed";

type VisitItem = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: RiskLevel;
  visitType: VisitType;
  date: string;
  time: string;
  notes: string;
  status: VisitStatus;
};

type MotherOption = {
  uid: string;
  motherName: string;
  riskLevel: RiskLevel;
};

export default function UpcomingVisitsPage() {
  const searchParams = useSearchParams();
  const [visitItems, setVisitItems] = useState<VisitItem[]>([]);
  const [motherProfiles, setMotherProfiles] = useState<MotherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<VisitType>(
    searchParams.get("tab") === "clinic" ? "clinic" : "home",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(searchParams.get("dateRange") || "All");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showReschedule, setShowReschedule] = useState<VisitItem | null>(null);
  const [showDelete, setShowDelete] = useState<VisitItem | null>(null);
  const [showComplete, setShowComplete] = useState<VisitItem | null>(null);
  const [newVisitForm, setNewVisitForm] = useState({
    motherUid: "",
    riskLevel: "" as RiskLevel | "",
    visitType: "home" as VisitType,
    dateTime: "",
    notes: "",
  });
  const [rescheduleDateTime, setRescheduleDateTime] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const addDateRef = useRef<HTMLInputElement>(null);
  const rescheduleDateRef = useRef<HTMLInputElement>(null);

  const itemsPerPage = 6;

  async function loadVisits() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/midwife/visits", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        visits?: VisitItem[];
        mothers?: MotherOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load visits.");
      }

      setVisitItems(payload.visits || []);
      setMotherProfiles(payload.mothers || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load visits.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVisits();
  }, []);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    const nextDateRange = searchParams.get("dateRange");
    const nextStatus = searchParams.get("status");

    if (nextTab === "home" || nextTab === "clinic") {
      setActiveTab(nextTab);
    }

    if (nextDateRange) {
      setDateRange(nextDateRange);
    }

    if (nextStatus) {
      setStatusFilter(nextStatus);
    }

    setCurrentPage(1);
  }, [searchParams]);

  const filteredVisits = useMemo(() => {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);
    const nextWeekDate = weekAhead.toISOString().slice(0, 10);

    return visitItems
      .filter((visit) => visit.visitType === activeTab)
      .filter(
        (visit) =>
          visit.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.notes.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((visit) => (statusFilter === "All" ? true : visit.status === statusFilter))
      .filter((visit) => {
        if (dateRange === "All") return true;
        if (dateRange === "Today") return visit.date === todayDate;
        if (dateRange === "This Week") return visit.date >= todayDate && visit.date <= nextWeekDate;
        if (dateRange === "Next 7 Days") return visit.date > todayDate && visit.date <= nextWeekDate;
        return true;
      });
  }, [activeTab, dateRange, searchTerm, statusFilter, visitItems]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedVisits = filteredVisits.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  const startItem = filteredVisits.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, filteredVisits.length);
  const hasActiveSearchOrFilter =
    searchTerm.trim().length > 0 || dateRange !== "All" || statusFilter !== "All";

  const openDatePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return;
    inputRef.current.showPicker?.();
    inputRef.current.focus();
    inputRef.current.click();
  };

  const handleSaveNewVisit = async () => {
    if (!newVisitForm.motherUid || !newVisitForm.riskLevel || !newVisitForm.dateTime) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/midwife/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motherUid: newVisitForm.motherUid,
          visitType: newVisitForm.visitType,
          dateTime: newVisitForm.dateTime,
          notes: newVisitForm.notes,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to create the visit.");

      await loadVisits();
      setActiveTab(newVisitForm.visitType);
      setCurrentPage(1);
      setShowAdd(false);
      setNewVisitForm({
        motherUid: "",
        riskLevel: "",
        visitType: activeTab,
        dateTime: "",
        notes: "",
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create the visit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!showReschedule || !rescheduleDateTime) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/midwife/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showReschedule.id,
          dateTime: rescheduleDateTime,
          notes: rescheduleNotes,
          status: "Rescheduled",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to reschedule the visit.");

      await loadVisits();
      setShowReschedule(null);
      setRescheduleDateTime("");
      setRescheduleNotes("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to reschedule the visit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!showDelete) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/midwife/visits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showDelete.id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to delete the visit.");

      await loadVisits();
      setShowDelete(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete the visit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!showComplete) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/midwife/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showComplete.id,
          status: "Completed",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to mark the visit as completed.");

      await loadVisits();
      setShowComplete(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to mark the visit as completed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="midwife-upcoming-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Upcoming Visits</h1>
          <p>
            Plan home and clinic visits, track overdue follow-ups, and update
            visit outcomes from one place.
          </p>
        </div>
        <button
          className="upcoming-add-btn"
          onClick={() => {
            setNewVisitForm({
              motherUid: "",
              riskLevel: "",
              visitType: activeTab,
              dateTime: "",
              notes: "",
            });
            setShowAdd(true);
          }}
        >
          + Add Upcoming Visit
        </button>
      </div>

      <div className="visit-toolbar">
        <div className="search-box visit-search">
          <Search size={18} />
          <input
            placeholder="Search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="visit-filter-group">
          <div className="visit-filter-select">
            <select value={dateRange} onChange={(event) => { setDateRange(event.target.value); setCurrentPage(1); }}>
              <option value="All">Date Range: All</option>
              <option value="Today">Date Range: Today</option>
              <option value="This Week">Date Range: This Week</option>
              <option value="Next 7 Days">Date Range: Next 7 Days</option>
            </select>
            <span className="visit-filter-icon">
              <ChevronDown size={18} />
            </span>
          </div>
          <div className="visit-filter-select">
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}>
              <option value="All">Status: All</option>
              <option value="Overdue">Status: Overdue</option>
              <option value="Upcoming">Status: Upcoming</option>
              <option value="Rescheduled">Status: Rescheduled</option>
              <option value="Completed">Status: Completed</option>
            </select>
            <span className="visit-filter-icon">
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </div>

      <div className="visit-tabs">
        <button className={`visit-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => { setActiveTab("home"); setCurrentPage(1); }}>
          Home Visits
        </button>
        <button className={`visit-tab ${activeTab === "clinic" ? "active" : ""}`} onClick={() => { setActiveTab("clinic"); setCurrentPage(1); }}>
          Clinic Visits
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading upcoming visits..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="visit-table-card">
            {paginatedVisits.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  {hasActiveSearchOrFilter ? (
                    <Search size={26} strokeWidth={2.2} />
                  ) : (
                    <CalendarDays size={26} strokeWidth={2.2} />
                  )}
                </div>
                <h3>
                  {hasActiveSearchOrFilter
                    ? "No matching visits found"
                    : `No ${activeTab === "home" ? "home" : "clinic"} visits yet`}
                </h3>
                <p>
                  {hasActiveSearchOrFilter
                    ? "Try a different mother name, note keyword, or clear the current filters."
                    : `Scheduled ${activeTab === "home" ? "home" : "clinic"} visits will appear here once they are added.`}
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
                      <span>Upcoming visit schedule</span>
                      <span>Mother risk level</span>
                      <span>Visit status tracking</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Risk Level</th>
                    <th>Upcoming Visit Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.motherName}</td>
                      <td>
                        <span className={`visit-risk-badge ${visit.riskLevel.toLowerCase()}`}>
                          {visit.riskLevel}
                        </span>
                      </td>
                      <td>{visit.date}, {visit.time}</td>
                      <td><span className={`visit-status ${visit.status.toLowerCase()}`}>{visit.status}</span></td>
                      <td className="visit-action-cell">
                        {visit.status === "Overdue" || visit.status === "Upcoming" || visit.status === "Rescheduled" ? (
                          <div className="visit-actions">
                            <button className="complete-btn" onClick={() => setShowComplete(visit)}>
                              Mark Completed
                            </button>
                            <button className="reschedule-btn" onClick={() => { setShowReschedule(visit); setRescheduleDateTime(`${visit.date}T${visit.time}`); setRescheduleNotes(visit.notes); }}>
                              Reschedule
                            </button>
                            <button className="icon-btn delete-btn" onClick={() => setShowDelete(visit)} aria-label="Delete visit">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : <span className="action-placeholder">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredVisits.length > itemsPerPage && (
            <div className="pagination pagination-enhanced">
              <div className="pagination-info">Showing {startItem}-{endItem} of {filteredVisits.length}</div>
              <div className="pagination-controls">
                <button className={`page-btn ${safeCurrentPage === 1 ? "disabled" : ""}`} disabled={safeCurrentPage === 1} onClick={() => safeCurrentPage > 1 && setCurrentPage(safeCurrentPage - 1)}>Previous</button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button key={index + 1} className={`page-number ${safeCurrentPage === index + 1 ? "active" : ""}`} onClick={() => setCurrentPage(index + 1)}>
                      {index + 1}
                    </button>
                  ))}
                </div>
                <button className={`page-btn ${safeCurrentPage === totalPages ? "disabled" : ""}`} disabled={safeCurrentPage === totalPages} onClick={() => safeCurrentPage < totalPages && setCurrentPage(safeCurrentPage + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card visit-modal">
            <h2 className="modal-title">ADD NEW UPCOMING VISIT</h2>
            <label>Mother</label>
            <div className="modal-input-icon">
              <select value={newVisitForm.motherUid} onChange={(event) => {
                const selected = motherProfiles.find((mother) => mother.uid === event.target.value);
                setNewVisitForm((prev) => ({ ...prev, motherUid: event.target.value, riskLevel: selected?.riskLevel ?? "" }));
              }}>
                <option value="">Select mother</option>
                {motherProfiles.map((mother) => (
                  <option key={mother.uid} value={mother.uid}>{mother.motherName}</option>
                ))}
              </select>
              <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}><ChevronDown size={18} /></button>
            </div>

            <label>Visit Type</label>
            <div className="modal-input-icon">
              <select value={newVisitForm.visitType} onChange={(event) => setNewVisitForm((prev) => ({ ...prev, visitType: event.target.value as VisitType }))}>
                <option value="home">Home Visit</option>
                <option value="clinic">Clinic Visit</option>
              </select>
              <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}><ChevronDown size={18} /></button>
            </div>

            <label>Next Visit Date and Time</label>
            <div className="modal-input-icon">
              <input ref={addDateRef} type="datetime-local" value={newVisitForm.dateTime} onChange={(event) => setNewVisitForm((prev) => ({ ...prev, dateTime: event.target.value }))} />
              <button type="button" className="modal-icon-trigger" onClick={() => openDatePicker(addDateRef)} aria-label="Open date picker"><CalendarDays size={18} /></button>
            </div>

            <label>Notes</label>
            <textarea rows={4} value={newVisitForm.notes} onChange={(event) => setNewVisitForm((prev) => ({ ...prev, notes: event.target.value }))} />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveNewVisit} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="modal-overlay">
          <div className="modal-card visit-modal">
            <h2 className="modal-title">RESCHEDULE VISIT</h2>
            <p className="modal-name-text">Name: <strong>{showReschedule.motherName}</strong></p>

            <label>New Visit Date and Time</label>
            <div className="modal-input-icon">
              <input ref={rescheduleDateRef} type="datetime-local" value={rescheduleDateTime} onChange={(event) => setRescheduleDateTime(event.target.value)} />
              <button type="button" className="modal-icon-trigger" onClick={() => openDatePicker(rescheduleDateRef)} aria-label="Open date picker"><CalendarDays size={18} /></button>
            </div>

            <label>Reason / Notes</label>
            <textarea rows={4} value={rescheduleNotes} onChange={(event) => setRescheduleNotes(event.target.value)} />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowReschedule(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveReschedule} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="modal-overlay">
          <div className="modal-card visit-modal">
            <h2 className="modal-title danger">DELETE VISIT</h2>
            <p className="modal-name-text">Are you sure you want to delete the visit for <strong>{showDelete.motherName}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleDeleteVisit} disabled={isSaving}>{isSaving ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {showComplete && (
        <div className="modal-overlay">
          <div className="modal-card visit-modal">
            <h2 className="modal-title">MARK VISIT AS COMPLETED</h2>
            <p className="modal-name-text">
              Mark the visit for <strong>{showComplete.motherName}</strong> as completed?
            </p>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowComplete(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCompleteVisit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
