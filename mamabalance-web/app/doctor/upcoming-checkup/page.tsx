"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCw,
  Search,
  Trash2,
} from "lucide-react";
import LoadingState from "@/components/admin/LoadingState";
import "@/app/doctor/styles/UpcomingCheckup.css";
import "@/app/midwife/styles/UpcomingVisits.css";
import "react-calendar/dist/Calendar.css";

type ViewMode = "calendar" | "list";

type CheckupStatus = "Overdue" | "Completed" | "Upcoming";
type RiskLevel = "Low" | "Moderate" | "High";

type MotherOption = {
  uid: string;
  motherName: string;
  riskLevel: RiskLevel;
};

function findMother(query: string, searchList: MotherOption[]) {
  const norm = query.toLowerCase().trim();
  if (!norm) return null;
  return searchList.find((m) =>
    m.motherName.toLowerCase().includes(norm) ||
    m.uid.toLowerCase().includes(norm)
  ) || null;
}

type CheckupItem = {
  id: number;
  motherName: string;
  riskLevel: RiskLevel;
  status: CheckupStatus;
  date: string;
  time: string;
  day: string;
  notes: string;
  duration: number;
  color: "mint" | "lavender" | "peach" | "sun";
};

const weekDays = [
  { key: "Mon", label: "Mon", accent: "DR" },
  { key: "Tue", label: "Tue", accent: "AM" },
  { key: "Wed", label: "Wed", accent: "WK" },
  { key: "Thu", label: "Thu", accent: "PM" },
  { key: "Fri", label: "Fri", accent: "FR" },
  { key: "Sat", label: "Sat", accent: "SA" },
  { key: "Sun", label: "Sun", accent: "SU" },
];

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];



export default function UpcomingCheckupsPage() {
  const [checkups, setCheckups] = useState<CheckupItem[]>([]);
  const [motherProfiles, setMotherProfiles] = useState<MotherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarRange, setCalendarRange] = useState("Week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("All");
  const [riskLevel, setRiskLevel] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<CheckupItem | null>(null);
  const [showDelete, setShowDelete] = useState<CheckupItem | null>(null);
  const [showReschedule, setShowReschedule] = useState<CheckupItem | null>(null);
  const [showComplete, setShowComplete] = useState<CheckupItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const addDateInputRef = useRef<HTMLInputElement>(null);
  const editDateInputRef = useRef<HTMLInputElement>(null);
  const rescheduleDateInputRef = useRef<HTMLInputElement>(null);

  const [addForm, setAddForm] = useState({
    motherQuery: "",
    dateTime: "",
    notes: "",
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    dateTime: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    notes: "",
  });

  const matchedMother = useMemo(
    () => findMother(addForm.motherQuery, motherProfiles),
    [addForm.motherQuery, motherProfiles]
  );

  async function loadCheckups() {
    setIsLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/doctor/checkups", { cache: "no-store" });
      const payload = await resp.json();
      if (!resp.ok) throw new Error(payload.error || "Failed to load checkups.");
      setCheckups(payload.checkups || []);
      setMotherProfiles(payload.mothers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load checkups.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckups();
  }, []);

  const filteredCheckups = useMemo(() => {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);
    const nextWeekDate = weekAhead.toISOString().slice(0, 10);

    return checkups.filter((item) => {
      const matchesSearch =
        item.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = riskLevel === "All" || item.riskLevel === riskLevel;
      const matchesDate =
        dateRange === "All" ||
        (dateRange === "Today" && item.date === todayDate) ||
        (dateRange === "This Week" && item.date >= todayDate && item.date <= nextWeekDate) ||
        (dateRange === "Next 7 Days" && item.date > todayDate && item.date <= nextWeekDate);

      return matchesSearch && matchesRisk && matchesDate;
    });
  }, [searchTerm, riskLevel, dateRange, checkups]);

  const getRiskClass = (value?: string) => value ? String(value).toLowerCase() : "low";
  const getStatusClass = (value?: string) => value ? String(value).toLowerCase() : "upcoming";

  const getGridPosition = (item: CheckupItem) => {
    let dayIndex = weekDays.findIndex((day) => day.key === item.day);
    if (dayIndex === -1) dayIndex = 0;

    const appointmentHour = Number(item.time.split(":")[0]);
    let slotIndex = timeSlots.findIndex((slot) => Number(slot.split(":")[0]) === appointmentHour);
    if (slotIndex === -1) slotIndex = timeSlots.length > 0 ? Math.min(Math.max(appointmentHour - 8, 0), timeSlots.length - 1) : 0;

    return {
      gridColumn: `${dayIndex + 2}`,
      gridRow: `${slotIndex + 2} / span ${item.duration || 1}`,
    };
  };

  const totalPages = Math.max(1, Math.ceil(filteredCheckups.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCheckups = filteredCheckups.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  const startItem = filteredCheckups.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, filteredCheckups.length);
  const hasActiveSearchOrFilter = searchTerm.trim().length > 0 || dateRange !== "All" || riskLevel !== "All";

  const todayHighlightItems = useMemo(() => {
    const todayLocalStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return checkups
      .filter((item) => item.date === todayLocalStr)
      .slice(0, 4)
      .map((item) => ({
        label: item.motherName,
        time: item.time,
        status: item.status,
        riskLevel: item.riskLevel,
      }));
  }, [checkups]);

  const monthCalendarData = useMemo(() => {
    const offset = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
    const shift = offset === 0 ? 6 : offset - 1; 
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const cellsLength = Math.max(35, Math.ceil((daysInMonth + shift) / 7) * 7);
    return { shift, daysInMonth, cellsLength };
  }, [selectedDate]);

  const currentWeekDates = useMemo(() => {
    const curr = new Date(selectedDate);
    const day = curr.getDay();
    const shift = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + shift);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return {
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: dd,
      };
    });
  }, [selectedDate]);

  const monthlyCalendarCheckups = useMemo(() => {
    const monthPrefix = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    return filteredCheckups.filter((item) => item.date.startsWith(monthPrefix));
  }, [filteredCheckups, selectedDate]);

  const weeklyCalendarCheckups = useMemo(() => {
    const weekStart = currentWeekDates[0].dateStr;
    const weekEnd = currentWeekDates[6].dateStr;
    return filteredCheckups.filter((item) => item.date >= weekStart && item.date <= weekEnd);
  }, [filteredCheckups, currentWeekDates]);
  
  const currentDayOfMonth = new Date().getDate();

  const openDatePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return;
    inputRef.current.showPicker?.();
    inputRef.current.focus();
    inputRef.current.click();
  };

  const handleSaveAdd = async () => {
    if (!matchedMother || !addForm.dateTime) return;
    try {
      setIsSaving(true);
      const resp = await fetch("/api/doctor/checkups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, motherUid: matchedMother.uid }),
      });
      if (!resp.ok) throw new Error("Failed to add checkup.");
      await loadCheckups();
      setShowAdd(false);
      setAddForm({ motherQuery: "", dateTime: "", notes: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!showReschedule || !rescheduleForm.dateTime) return;
    try {
      setIsSaving(true);
      const resp = await fetch("/api/doctor/checkups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showReschedule.id,
          dateTime: rescheduleForm.dateTime,
          notes: rescheduleForm.notes,
        }),
      });
      if (!resp.ok) throw new Error("Failed to reschedule.");
      await loadCheckups();
      setShowReschedule(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!showEdit) return;
    try {
      setIsSaving(true);
      const resp = await fetch("/api/doctor/checkups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showEdit.id,
          notes: editForm.notes,
        }),
      });
      if (!resp.ok) throw new Error("Failed to update.");
      await loadCheckups();
      setShowEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      setIsSaving(true);
      const resp = await fetch("/api/doctor/checkups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showDelete.id }),
      });
      if (!resp.ok) throw new Error("Failed to delete.");
      await loadCheckups();
      setShowDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!showComplete) return;
    try {
      setIsSaving(true);
      const resp = await fetch("/api/doctor/checkups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showComplete.id, status: "Completed" }),
      });
      if (!resp.ok) throw new Error("Failed to complete.");
      await loadCheckups();
      setShowComplete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="upcoming-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Upcoming Checkup</h1>
          <p>Schedule upcoming or overdue follow-up visits for your assigned mothers.</p>
        </div>

        <div className="doctor-page-header-actions upcoming-actions">
          <div className="view-switch">
            <button
              className={viewMode === "list" ? "view-pill active" : "view-pill"}
              onClick={() => setViewMode("list")}
            >
              List View
            </button>
            <button
              className={viewMode === "calendar" ? "view-pill active" : "view-pill"}
              onClick={() => setViewMode("calendar")}
            >
              Calendar View
            </button>
          </div>
          <button className="checkup-add-btn" onClick={() => setShowAdd(true)}>
            + Add Upcoming Checkup
          </button>
        </div>
      </div>

      {error && <div style={{ color: "red", padding: "10px", textAlign: "center" }}>{error}</div>}

      {isLoading ? (
        <LoadingState label="Loading checkups..." />
      ) : viewMode === "calendar" ? (
        <section className="calendar-layout">
          <aside className="calendar-sidebar">
            <div className="today-card">
              <div className="today-heading">
                <span className="today-icon">TD</span>
                <h4>Today</h4>
              </div>

              <div className="today-list">
                {todayHighlightItems.map((item) => (
                  <div key={`${item.label}-${item.time}`} className="today-card-item">
                    <div className="today-card-header">
                      <span className={`today-dot ${getStatusClass(item.status)}`} title={item.status} />
                      <span className="today-label">{item.label}</span>
                    </div>
                    <div className="today-card-details">
                      <span className={`visit-risk-badge ${getRiskClass(item.riskLevel)}`}>
                        {item.riskLevel || "Unknown"}
                      </span>
                      <span className="today-time">{item.time}</span>
                    </div>
                  </div>
                ))}
                {todayHighlightItems.length === 0 && (
                  <div className="today-card-item" style={{ alignItems: "center", color: "#888", fontSize: "0.85rem", padding: "20px 10px" }}>
                    No checkups scheduled today.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="calendar-panel">
            <div className="calendar-toolbar">
              <div className="calendar-nav-controls">
                <button 
                  className="calendar-nav-btn" 
                  onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={20} />
                </button>
                <h3>{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button 
                  className="calendar-nav-btn" 
                  onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="calendar-select-wrap">
                <select
                  className="calendar-select"
                  value={calendarRange}
                  onChange={(event) => setCalendarRange(event.target.value)}
                >
                  <option value="Week">Week</option>
                  <option value="Month">Month</option>
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="schedule-board">
              {calendarRange === "Week" ? (
                <div className="schedule-grid">
                  <div className="schedule-corner" style={{ gridColumn: 1, gridRow: 1 }} />
                  {weekDays.map((day, idx) => (
                    <div key={day.key} className="schedule-day-header" style={{ gridColumn: idx + 2, gridRow: 1 }}>
                      <span>{currentWeekDates[idx].dayNum}</span>
                      <strong>{day.label}</strong>
                    </div>
                  ))}

                  {timeSlots.map((time, idx) => (
                    <div key={`time-${time}`} className="time-label" style={{ gridColumn: 1, gridRow: idx + 2 }}>
                      {time}
                    </div>
                  ))}

                  {timeSlots.flatMap((time) =>
                    weekDays.map((day) => (
                      <div
                        key={`${day.key}-${time}`}
                        className="schedule-cell"
                        style={{
                          gridColumn: weekDays.findIndex((item) => item.key === day.key) + 2,
                          gridRow: timeSlots.findIndex((slot) => slot === time) + 2,
                        }}
                      />
                    )),
                  )}

                  {weeklyCalendarCheckups.map((item) => (
                    <button
                      key={item.id}
                      className={`schedule-event ${getStatusClass(item.status)}`}
                      style={getGridPosition(item)}
                      onClick={() => setShowEdit(item)}
                    >
                      <span className="schedule-event-title">{item.motherName}</span>
                      <span className="schedule-event-time">{item.time}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="month-grid">
                  <div className="month-header">
                    {weekDays.map((day) => (
                      <div key={day.key} className="month-day-name">
                        {day.label}
                      </div>
                    ))}
                  </div>

                  <div className="month-body">
                    {Array.from({ length: monthCalendarData.cellsLength }, (_, index) => {
                      const dayNumber = index - monthCalendarData.shift + 1;
                      const isValidDay = dayNumber > 0 && dayNumber <= monthCalendarData.daysInMonth;
                      const event = isValidDay ? monthlyCalendarCheckups.find((item) => Number(item.date.slice(-2)) === dayNumber) : null;
                      
                      return (
                        <div key={`cell-${index}`} className="month-cell">
                          {isValidDay && (
                            <span className={dayNumber === currentDayOfMonth && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear() ? "month-date active" : "month-date"}>
                              {String(dayNumber).padStart(2, "0")}
                            </span>
                          )}
                          {event && (
                            <button
                              className={`month-event ${getStatusClass(event.status)}`}
                              onClick={() => setShowEdit(event)}
                            >
                              <span>{event.motherName}</span>
                              <small>{event.time}</small>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="list-layout">
          <div className="visit-toolbar">
            <div className="search-box visit-search">
              <Search size={18} />
              <input
                placeholder="Search by mother, note, risk level, or status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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
                <select value={riskLevel} onChange={(event) => { setRiskLevel(event.target.value); setCurrentPage(1); }}>
                  <option value="All">Risk Level: All</option>
                  <option value="Low">Risk Level: Low</option>
                  <option value="Moderate">Risk Level: Moderate</option>
                  <option value="High">Risk Level: High</option>
                </select>
                <span className="visit-filter-icon">
                  <ChevronDown size={18} />
                </span>
              </div>
            </div>
          </div>

          <div className="visit-table-card">
            {paginatedCheckups.length === 0 ? (
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
                    ? "No matching checkups found"
                    : "No checkups yet"}
                </h3>
                <p>
                  {hasActiveSearchOrFilter
                    ? "Try a different mother name, note keyword, or clear the current filters."
                    : "Scheduled checkups will appear here once they are added."}
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
                      <span>Upcoming schedule</span>
                      <span>Mother risk level</span>
                      <span>Status tracking</span>
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
                  {paginatedCheckups.map((item) => (
                    <tr key={item.id}>
                      <td>{item.motherName}</td>
                      <td>
                        <span className={`visit-risk-badge ${getRiskClass(item.riskLevel)}`}>
                          {item.riskLevel}
                        </span>
                      </td>
                      <td>{item.date}, {item.time}</td>
                      <td><span className={`visit-status ${getStatusClass(item.status)}`}>{item.status}</span></td>
                      <td className="visit-action-cell">
                        {item.status === "Overdue" || item.status === "Upcoming" ? (
                          <div className="visit-actions">
                            <button className="complete-btn" onClick={() => setShowComplete(item)} disabled={isSaving}>
                              Mark Completed
                            </button>
                            <button className="reschedule-btn" onClick={() => { setShowReschedule(item); setRescheduleForm({ dateTime: `${item.date}T${item.time}`, notes: item.notes }); }}>
                              Reschedule
                            </button>
                            <button className="icon-btn delete-btn" onClick={() => setShowDelete(item)} aria-label="Delete visit">
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

          {filteredCheckups.length > itemsPerPage && (
            <div className="pagination pagination-enhanced">
              <div className="pagination-info">
                Showing {startItem}-{endItem} of {filteredCheckups.length}
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
          )}
        </section>
      )}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card checkup-modal">
            <h2 className="modal-title">ADD NEW UPCOMING CHECKUP</h2>

            <label>Mother (name or user ID)</label>
            <input 
              value={addForm.motherQuery} 
              onChange={(e) => setAddForm(prev => ({ ...prev, motherQuery: e.target.value }))}
              placeholder="Search mother by name or user ID"
            />

            <div className="matched-mother-inline">
              {matchedMother ? (
                <div className="selected-mother-box">
                  <p><strong>Name:</strong> {matchedMother.motherName}</p>
                  <p><strong>Risk:</strong> <span className={`table-risk-badge ${matchedMother.riskLevel.toLowerCase()}`}>{matchedMother.riskLevel}</span></p>
                </div>
              ) : (
                <span className="matched-mother-text">Start typing a mother&apos;s name or user ID.</span>
              )}
            </div>

            <label>Next Checkup Date and Time</label>
            <div className="modal-input-icon">
              <input 
                ref={addDateInputRef} 
                type="datetime-local" 
                value={addForm.dateTime}
                onChange={(e) => setAddForm(prev => ({ ...prev, dateTime: e.target.value }))}
              />
              <button
                type="button"
                className="modal-icon-trigger"
                onClick={() => openDatePicker(addDateInputRef)}
                aria-label="Open date picker"
              >
                <CalendarDays size={18} />
              </button>
            </div>

            <label>Notes</label>
            <textarea 
              rows={4} 
              value={addForm.notes}
              onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
            />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveAdd} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-card checkup-modal">
            <h2 className="modal-title">UPDATE UPCOMING CHECKUP</h2>

            <p className="modal-name-text">
              Name: <strong>{showEdit.motherName}</strong>
            </p>

            <label>Upcoming Checkup Date</label>
            <div className="modal-input-icon" style={{ pointerEvents: 'none', opacity: 0.7 }}>
              <input
                type="text"
                readOnly
                value={`${showEdit.date} at ${showEdit.time}`}
              />
            </div>

            <label>Notes</label>
            <textarea 
              rows={4} 
              defaultValue={showEdit.notes} 
              onChange={(e) => setEditForm({ notes: e.target.value })} 
            />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowEdit(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="modal-overlay">
          <div className="modal-card checkup-modal delete-modal">
            <h2 className="modal-title danger">DELETE CONFIRMATION</h2>

            <p className="delete-copy">
              Are you sure you want to delete the upcoming checkup
              {showDelete ? ` for ${showDelete.motherName}` : ""}?
            </p>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowDelete(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="modal-overlay">
          <div className="modal-card checkup-modal">
            <h2 className="modal-title">RESCHEDULE CHECKUP</h2>

            <p className="modal-name-text">
              Name: <strong>{showReschedule.motherName}</strong>
            </p>
            <p className="reschedule-copy" style={{ marginBottom: "16px" }}>
              Previous appointment: <strong>{showReschedule.date}</strong> at <strong>{showReschedule.time}</strong>
            </p>

            <label>Rescheduled Date and Time</label>
            <div className="modal-input-icon">
              <input
                ref={rescheduleDateInputRef}
                type="datetime-local"
                value={rescheduleForm.dateTime}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, dateTime: e.target.value }))}
              />
              <button
                type="button"
                className="modal-icon-trigger"
                onClick={() => openDatePicker(rescheduleDateInputRef)}
                aria-label="Open date picker"
              >
                <CalendarDays size={18} />
              </button>
            </div>

            <label>Reschedule Notes</label>
            <textarea
              rows={4}
              value={rescheduleForm.notes}
              onChange={(e) => setRescheduleForm(prev => ({ ...prev, notes: e.target.value }))}
            />

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowReschedule(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveReschedule} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showComplete && (
        <div className="modal-overlay">
          <div className="modal-card checkup-modal delete-modal">
            <h2 className="modal-title">MARK CHECKUP AS COMPLETED</h2>

            <p className="modal-name-text">
              Mark the checkup for <strong>{showComplete.motherName}</strong> as completed?
            </p>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowComplete(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleComplete} disabled={isSaving}>
                {isSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
