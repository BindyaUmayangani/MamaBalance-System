"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Eye, Filter, Search, ShieldAlert, FileText, FileDown } from "lucide-react";

import FilterModal from "@/app/superadmin/user-management/modals/FilterModal";
import Pagination from "@/app/superadmin/components/Pagination";
import LoadingState from "@/components/admin/LoadingState";
import EpdsTrendChart from "@/components/common/EpdsTrendChart";
import type { MidwifeMotherRecord } from "@/lib/midwife/types";
import { generatePatientSummaryPdf, type PatientSummaryResponse } from "@/lib/doctor/patientSummaryPdf";
import "@/app/doctor/styles/AssignedMothers.css";
import "@/app/doctor/styles/MedicationManagement.css";

type DoctorMotherRecord = MidwifeMotherRecord;

export type MedicationRecord = {
  id: string;
  motherUid: string;
  motherName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  status: "Active" | "Completed" | "Stopped";
  notes: string;
  instructions: string;
  reasonStopped?: string;
};

type EditMedicationForm = {
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  instructions: string;
};

type StopMode = "single" | "all";

const EMPTY_EDIT_FORM: EditMedicationForm = {
  medicationName: "",
  dosage: "",
  frequency: "",
  startDate: "",
  endDate: "",
  notes: "",
  instructions: "",
};

export type ObservationRecord = {
  id: string;
  source: string;
  motherUid: string;
  motherName: string;
  timestamp: string;
  observedAt: string;
  title: string;
  note: string;
  riskLevel: string;
  mood: string;
  sleep: string;
  appetite: string;
  additional: string;
  upcomingCheckup: string;
  observedBy: string;
};

const columns = [
  { key: "userId", label: "User ID" },
  { key: "username", label: "Username" },
  { key: "name", label: "Name" },
  { key: "risk", label: "Risk Level" },
  { key: "checkup", label: "Upcoming Checkup Date" },
  { key: "status", label: "Last Checkup Status" },
  { key: "epds", label: "Last EPDS Score" },
  { key: "epdsDate", label: "Last EPDS Test Date" },
] as const;

function riskLabel(risk: DoctorMotherRecord["risk"]) {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

function statusLabel(status: DoctorMotherRecord["lastStatus"]) {
  if (status === "overdue") return "Overdue";
  if (status === "completed") return "Completed";
  return "Upcoming";
}

function formatDosage(dosage: string) {
  return dosage.replace(/mg/gi, "").trim();
}

export default function AssignedMothersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mothers, setMothers] = useState<DoctorMotherRecord[]>([]);
  const [allMedications, setAllMedications] = useState<MedicationRecord[]>([]);
  const [allObservations, setAllObservations] = useState<ObservationRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const [selectedMother, setSelectedMother] = useState<DoctorMotherRecord | null>(null);
  const [selectedMotherSummary, setSelectedMotherSummary] = useState<PatientSummaryResponse | null>(null);
  const [selectedMotherSummaryLoading, setSelectedMotherSummaryLoading] = useState(false);
  const [selectedMotherSummaryError, setSelectedMotherSummaryError] = useState("");
  const [selectedObservationMother, setSelectedObservationMother] = useState<DoctorMotherRecord | null>(null);
  const [downloadingMotherUid, setDownloadingMotherUid] = useState("");

  // Observation Pagination & Filtering
  const [observationPage, setObservationPage] = useState(1);
  const [observationFilter, setObservationFilter] = useState("all");

  // Medication Mutability & Pagination State
  const [activeMedPage, setActiveMedPage] = useState(1);
  const [historyMedPage, setHistoryMedPage] = useState(1);

  const [editRecord, setEditRecord] = useState<MedicationRecord | null>(null);
  const [stopRecord, setStopRecord] = useState<MedicationRecord | null>(null);
  const [editForm, setEditForm] = useState<EditMedicationForm>(EMPTY_EDIT_FORM);
  const [stopReason, setStopReason] = useState("");
  const [selectedStopMedicationId, setSelectedStopMedicationId] = useState("");
  const [stopMode, setStopMode] = useState<StopMode>("single");
  const [medMutationLoading, setMedMutationLoading] = useState(false);

  const [localHighlightedUserId, setLocalHighlightedUserId] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    userId: true,
    username: true,
    name: true,
    risk: true,
    checkup: true,
    status: true,
    epds: true,
    epdsDate: true,
  });

  const pageSize = 6;
  const highlightedUserId = searchParams.get("highlight") || "";
  const activeHighlightedUserId = localHighlightedUserId || highlightedUserId;

  function matchesHighlightedMother(mother: DoctorMotherRecord, highlight: string) {
    if (!highlight) return false;
    return mother.uid === highlight || mother.userId === highlight;
  }

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [mothersRes, medsRes, obsRes] = await Promise.all([
        fetch("/api/doctor/mothers", { cache: "no-store" }),
        fetch("/api/doctor/medications", { cache: "no-store" }),
        fetch("/api/doctor/observations", { cache: "no-store" })
      ]);

      const [mothersPayload, medsPayload, obsPayload] = await Promise.all([
        mothersRes.json(), medsRes.json(), obsRes.json()
      ]);

      if (!mothersRes.ok) throw new Error(mothersPayload.error || "Unable to load assigned mothers.");

      setMothers(mothersPayload.mothers || []);
      setAllMedications(medsPayload.medications || []);
      setAllObservations(obsPayload.observations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workspace data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => {
    const modalLayer = document.createElement("div");
    modalLayer.setAttribute("id", "doctor-assigned-mothers-modal-root");
    Object.assign(modalLayer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      pointerEvents: "none",
    });
    document.body.appendChild(modalLayer);
    setPortalRoot(modalLayer);

    return () => {
      modalLayer.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedMotherSummary() {
      if (!selectedMother?.uid) {
        if (isMounted) {
          setSelectedMotherSummary(null);
          setSelectedMotherSummaryError("");
          setSelectedMotherSummaryLoading(false);
        }
        return;
      }

      try {
        setSelectedMotherSummaryLoading(true);
        setSelectedMotherSummaryError("");
        const response = await fetch(`/api/doctor/mothers/${encodeURIComponent(selectedMother.uid)}/summary`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as PatientSummaryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load EPDS trend.");
        }

        if (isMounted) {
          setSelectedMotherSummary(payload);
        }
      } catch (caughtError) {
        if (isMounted) {
          setSelectedMotherSummary(null);
          setSelectedMotherSummaryError(
            caughtError instanceof Error ? caughtError.message : "Unable to load EPDS trend.",
          );
        }
      } finally {
        if (isMounted) {
          setSelectedMotherSummaryLoading(false);
        }
      }
    }

    void loadSelectedMotherSummary();

    return () => {
      isMounted = false;
    };
  }, [selectedMother?.uid]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const filteredMothers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return mothers.filter((mother) => {
      const matchesSearch = !query ||
        mother.userId.toLowerCase().includes(query) ||
        mother.username.toLowerCase().includes(query) ||
        mother.name.toLowerCase().includes(query) ||
        mother.nic.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || mother.lastStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [mothers, searchTerm, statusFilter]);

  const paginatedMothers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMothers.slice(start, start + pageSize);
  }, [currentPage, filteredMothers]);

  useEffect(() => {
    if (!highlightedUserId) return;
    const idx = filteredMothers.findIndex((m) => matchesHighlightedMother(m, highlightedUserId));
    if (idx !== -1) setCurrentPage(Math.floor(idx / pageSize) + 1);
  }, [filteredMothers, highlightedUserId, pageSize]);

  function triggerRowHighlight(highlightKey: string) {
    setLocalHighlightedUserId(highlightKey);

    window.setTimeout(() => {
      setLocalHighlightedUserId((current) => (current === highlightKey ? "" : current));
    }, 10000);
  }

  async function downloadPatientSummary(mother: DoctorMotherRecord) {
    setDownloadingMotherUid(mother.uid);

    try {
      const response = await fetch(`/api/doctor/mothers/${encodeURIComponent(mother.uid)}/summary`, {
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
      setDownloadingMotherUid("");
    }
  }

  // Derived Selection State Lookups
  const activeMotherObs = useMemo(() => {
    if (!selectedObservationMother) return [];
    let filtered = allObservations.filter(o => o.motherUid === selectedObservationMother.uid);
    if (observationFilter !== "all") {
      filtered = filtered.filter(o => o.source === observationFilter);
    }
    return filtered;
  }, [selectedObservationMother, allObservations, observationFilter]);

  const obsTotalPages = Math.max(1, Math.ceil(activeMotherObs.length / 3));
  const activeMotherObsPaginated = activeMotherObs.slice((observationPage - 1) * 3, observationPage * 3);

  const activeMotherMeds = useMemo(() => {
    if (!selectedObservationMother) return [];
    return allMedications.filter(m => m.motherUid === selectedObservationMother.uid && m.status === "Active");
  }, [selectedObservationMother, allMedications]);

  const historyMotherMeds = useMemo(() => {
    if (!selectedObservationMother) return [];
    return allMedications.filter(m => m.motherUid === selectedObservationMother.uid && m.status !== "Active");
  }, [selectedObservationMother, allMedications]);

  const editOptions = editRecord
    ? allMedications.filter((item) => item.motherUid === editRecord.motherUid)
    : [];

  const stopOptions = stopRecord
    ? allMedications.filter((item) => item.motherUid === stopRecord.motherUid && item.status === "Active")
    : [];

  const activeMedsTotalPages = Math.max(1, activeMotherMeds.length);
  const activeMotherMedsPaginated = activeMotherMeds.slice(activeMedPage - 1, activeMedPage);

  const historyMedsTotalPages = Math.max(1, historyMotherMeds.length);
  const historyMotherMedsPaginated = historyMotherMeds.slice(historyMedPage - 1, historyMedPage);

  const openEditMedication = (record: MedicationRecord) => {
    setEditRecord(record);
    setEditForm({
      medicationName: record.medicationName,
      dosage: formatDosage(record.dosage),
      frequency: record.frequency,
      startDate: record.startDate,
      endDate: record.endDate,
      notes: record.notes,
      instructions: record.instructions,
    });
  };

  const changeEditTarget = (medicationId: string) => {
    const target = allMedications.find((item) => item.id === medicationId);
    if (!target) return;
    openEditMedication(target);
  };

  const openStopMedication = (record: MedicationRecord) => {
    if (record.status !== "Active") return;
    const activeForMother = allMedications.filter(
      (item) => item.motherUid === record.motherUid && item.status === "Active",
    );
    setStopRecord(record);
    setSelectedStopMedicationId(activeForMother.length > 0 ? activeForMother[0].id : record.id);
    setStopMode("single");
    setStopReason("");
  };

  // Handlers for Medication Mutability
  const handleUpdateMedication = async () => {
    if (!editRecord) return;
    setMedMutationLoading(true);
    try {
      const payload = {
        medicationId: editRecord.id,
        action: "UPDATE",
        medicationName: editForm.medicationName,
        dosage: editForm.dosage,
        frequency: editForm.frequency,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        notes: editForm.notes,
        instructions: editForm.instructions,
      };
      const res = await fetch("/api/doctor/medications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update medication");
      await loadData();
      setEditRecord(null);
      setEditForm(EMPTY_EDIT_FORM);
    } catch (err) {
      alert("Error updating medication.");
    } finally {
      setMedMutationLoading(false);
    }
  };

  const handleStopMedication = async () => {
    if (!stopRecord || medMutationLoading) return;
    if (stopMode === "single" && !selectedStopMedicationId) return;
    setMedMutationLoading(true);
    try {
      const idsToStop =
        stopMode === "all"
          ? stopOptions.map((option) => option.id)
          : [selectedStopMedicationId];

      await Promise.all(
        idsToStop.map(async (id) => {
          const res = await fetch("/api/doctor/medications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              medicationId: id,
              action: "STOP",
              reasonStopped: stopReason,
            }),
          });
          if (!res.ok) throw new Error("Failed to stop medication");
        }),
      );

      await loadData();
      setStopRecord(null);
      setStopReason("");
      setSelectedStopMedicationId("");
      setStopMode("single");
    } catch (err) {
      alert("Error stopping medication.");
    } finally {
      setMedMutationLoading(false);
    }
  };

  const hasActiveSearchOrFilter = searchTerm.trim().length > 0 || statusFilter.trim().length > 0;

  return (
    <div className="assigned-page">
      <div className="role-header">
        <h1>Assigned Mothers</h1>
        <p>Review the mothers currently assigned to your care by midwives or admins.</p>
      </div>

      <div className="filter-row">
        <div className="search-box">
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder="Search by mother ID, name, username, or NIC"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="filter-row-actions">
          <div className="filter-select-wrap">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Visit Status: All</option>
              <option value="upcoming">Visit Status: Upcoming</option>
              <option value="overdue">Visit Status: Overdue</option>
              <option value="completed">Visit Status: Completed</option>
            </select>
            <span className="filter-select-icon" aria-hidden="true">
              <ChevronDown size={18} strokeWidth={2.4} />
            </span>
          </div>

          <button className="filter-btn" onClick={() => setShowFilterModal(true)}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading assigned mothers..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <div className="table-card">
          {filteredMothers.length === 0 ? (
            <div className="doctor-empty-state">
              <div className="doctor-empty-state-icon" aria-hidden="true">
                <ShieldAlert size={26} strokeWidth={2.2} />
              </div>
              <h3>{hasActiveSearchOrFilter ? "No matching mothers found" : "No assigned mothers yet"}</h3>
              <p>
                {hasActiveSearchOrFilter
                  ? "Try a different name, ID, username, NIC, or clear the current filters."
                  : "This workspace will fill in once a midwife or admin assigns mothers to your care."}
              </p>
              <div className="doctor-empty-state-tips">
                {hasActiveSearchOrFilter ? (
                  <><span>Check spelling</span><span>Try fewer keywords</span><span>Clear filters</span></>
                ) : (
                  <><span>Mother profile details</span><span>Upcoming checkup schedule</span><span>Latest EPDS summary</span></>
                )}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {visibleColumns.userId && <th>User ID</th>}
                  {visibleColumns.username && <th>Username</th>}
                  {visibleColumns.name && <th>Name</th>}
                  {visibleColumns.risk && <th>Risk Level</th>}
                  {visibleColumns.checkup && <th>Upcoming Checkup Date</th>}
                  {visibleColumns.status && <th>Last Checkup Status</th>}
                  {visibleColumns.epds && <th>Last EPDS Score</th>}
                  {visibleColumns.epdsDate && <th>Last EPDS Test Date</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedMothers.map((mother) => (
                  <tr
                    key={mother.uid}
                    data-highlight-keys={`${mother.uid} ${mother.userId}`}
                    className={matchesHighlightedMother(mother, activeHighlightedUserId) ? "dashboard-highlight-row" : ""}
                  >
                    {visibleColumns.userId && <td>{mother.userId}</td>}
                    {visibleColumns.username && <td>{mother.username}</td>}
                    {visibleColumns.name && <td>{mother.name}</td>}
                    {visibleColumns.risk && (
                      <td><span className={`table-risk-badge ${mother.risk}`}>{riskLabel(mother.risk)}</span></td>
                    )}
                    {visibleColumns.checkup && <td>{mother.upcomingCheckup}</td>}
                    {visibleColumns.status && (
                      <td>
                        <span className={`visit-status ${mother.lastStatus}`}>
                          {statusLabel(mother.lastStatus)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.epds && <td>{mother.lastEPDS}</td>}
                    {visibleColumns.epdsDate && <td>{mother.lastEPDSTestDate}</td>}
                    <td className="actions">
                      <Eye
                        size={18}
                        onClick={() => {
                          triggerRowHighlight(mother.uid || mother.userId);
                          setSelectedMother(mother);
                        }}
                      />
                      <FileText
                        size={18}
                        className="observation-icon"
                        onClick={() => {
                          triggerRowHighlight(mother.uid || mother.userId);
                          setSelectedObservationMother(mother);
                          setObservationPage(1);
                          setActiveMedPage(1);
                          setHistoryMedPage(1);
                        }}
                      />
                      <FileDown
                        size={18}
                        className={downloadingMotherUid === mother.uid ? "report-icon loading" : "report-icon"}
                        onClick={() => {
                          triggerRowHighlight(mother.uid || mother.userId);
                          void downloadPatientSummary(mother);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!isLoading && !error && (
        <Pagination currentPage={currentPage} totalItems={filteredMothers.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      )}

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <FilterModal columns={columns} visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} onClose={() => setShowFilterModal(false)} />
          </div>
        </div>
      )}

      {/* PROFILE VIEW MODAL */}
      {selectedMother && portalRoot && createPortal(
        <div className="modal-overlay assigned-mothers-modal-overlay" onClick={() => setSelectedMother(null)}>
          <div className="modal-card mother-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-banner">
              <div>
                <h2>Mother Profile: {selectedMother.name}</h2>
                {selectedMotherSummaryLoading ? <p className="profile-load-note">Refreshing EPDS trend...</p> : null}
                {selectedMotherSummaryError ? <p className="profile-error-note">{selectedMotherSummaryError}</p> : null}
              </div>
              <span className={`profile-risk-badge ${selectedMother.risk}`}>{riskLabel(selectedMother.risk)}</span>
            </div>
            <div className="profile-top-grid">
              <div className="profile-panel">
                <h3>Personal Info</h3>
                <div className="profile-info-list">
                  <p><span>Name:</span> <strong>{selectedMother.name}</strong></p>
                  <p><span>NIC:</span> <strong>{selectedMother.nic}</strong></p>
                  <p><span>Email:</span> <strong>{selectedMother.email}</strong></p>
                  <p><span>Region:</span> <strong>{selectedMother.region}</strong></p>
                  <p><span>Contact No:</span> <strong>{selectedMother.contact}</strong></p>
                  <p><span>Birthday:</span> <strong>{selectedMother.birthday}</strong></p>
                  <p><span>Address:</span> <strong>{selectedMother.address}</strong></p>
                  <p><span>Guardian Name:</span> <strong>{selectedMother.guardianName}</strong></p>
                  <p><span>Guardian Contact No:</span> <strong>{selectedMother.guardianContact}</strong></p>
                  <p><span>Delivery Date:</span> <strong>{selectedMother.deliveryDate}</strong></p>
                  <p><span>No of Children:</span> <strong>{selectedMother.children}</strong></p>
                </div>
              </div>
              <div className="profile-panel">
                <h3>EPDS Score Trend</h3>
                <EpdsTrendChart
                  history={selectedMotherSummary?.epdsHistory}
                  fallbackScore={Number(selectedMother.lastEPDS) || 0}
                  fallbackSubmittedAt={selectedMother.lastEPDSTestDate}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => void downloadPatientSummary(selectedMother)} disabled={downloadingMotherUid === selectedMother.uid}>
                {downloadingMotherUid === selectedMother.uid ? "Generating..." : "Download Summary Report"}
              </button>
              <button className="btn-outline" onClick={() => setSelectedMother(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        portalRoot,
      )}

      {/* OBSERVATIONS & MEDICATIONS MODAL */}
      {selectedObservationMother && portalRoot && createPortal(
        <div className="modal-overlay assigned-mothers-modal-overlay" onClick={() => setSelectedObservationMother(null)}>
          <div className="modal-card mother-observation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-banner compact">
              <div>
                <h2>{selectedObservationMother.name} Overview</h2>
              </div>
              <span className={`profile-risk-badge ${selectedObservationMother.risk}`}>
                {riskLabel(selectedObservationMother.risk)}
              </span>
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>Observation Timeline</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={observationFilter}
                    onChange={(e) => { setObservationFilter(e.target.value); setObservationPage(1); }}
                    className="internal-modal-select"
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1eae0', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Sources</option>
                    <option value="doctor">Doctor&apos;s Observation</option>
                    <option value="homeVisit">Home Visit</option>
                    <option value="clinicVisit">Clinic Visit</option>
                  </select>
                  <button className="section-link-btn" type="button" onClick={() => router.push(`/doctor/medical-observation?search=${selectedObservationMother.username}`)}>
                    View All
                  </button>
                </div>
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
                    {activeMotherObsPaginated.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.timestamp}</td>
                        <td>{entry.title}</td>
                        <td>{entry.mood}</td>
                        <td>{entry.sleep}</td>
                        <td>{entry.appetite}</td>
                        <td>{entry.upcomingCheckup}</td>
                        <td>{entry.observedBy}</td>
                      </tr>
                    ))}
                    {activeMotherObsPaginated.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No observations found for this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {obsTotalPages > 0 && (
                <div className="inline-pagination">
                  <button className={`pager-btn ${observationPage === 1 ? "disabled" : ""}`} onClick={() => observationPage > 1 && setObservationPage(observationPage - 1)}>
                    &lt;
                  </button>
                  <span className="pager-indicator">{observationPage}</span>
                  <button className={`pager-btn ${observationPage === obsTotalPages ? "disabled" : ""}`} onClick={() => observationPage < obsTotalPages && setObservationPage(observationPage + 1)}>
                    &gt;
                  </button>
                </div>
              )}
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>Medication</h3>
                <button className="section-link-btn" type="button" onClick={() => router.push(`/doctor/medication-management?search=${selectedObservationMother.name}`)}>
                  Manage All
                </button>
              </div>

              <div className="medication-panels" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', gap: '20px' }}>
                {/* Active Meds Panel */}
                <div className="medication-panel active-medication-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4>Active Medications <span className="medication-count-chip">{activeMotherMeds.length}</span></h4>
                  <div style={{ flex: 1 }}>
                    {activeMotherMedsPaginated.length > 0 ? (
                      activeMotherMedsPaginated.map((med) => (
                        <div key={med.id} className="medication-copy medication-card" style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => openEditMedication(med)} style={{ background: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Edit</button>
                            <button onClick={() => openStopMedication(med)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Stop</button>
                          </div>
                          <p><span>Medication Name:</span> {med.medicationName}</p>
                          <p><span>Dosage:</span> {formatDosage(med.dosage)} mg</p>
                          <p><span>Frequency:</span> {med.frequency || "-"}</p>
                          <p><span>Start Date:</span> {med.startDate}</p>
                          <p><span>End Date:</span> {med.endDate || "-"}</p>
                          <p><span>Prescribed by:</span> {med.prescribedBy}</p>
                          <p><span>Notes:</span> {med.notes || "-"}</p>
                          <p><span>Instructions:</span> {med.instructions || "-"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="medication-copy medication-card" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                        No active medications currently noted.
                      </div>
                    )}
                  </div>
                  {activeMedsTotalPages > 0 && activeMotherMeds.length > 0 && (
                    <div className="inline-pagination centered">
                      <button className={`pager-btn ${activeMedPage === 1 ? "disabled" : ""}`} onClick={() => activeMedPage > 1 && setActiveMedPage(activeMedPage - 1)}>
                        &lt;
                      </button>
                      <span className="pager-indicator">{activeMedPage}</span>
                      <button className={`pager-btn ${activeMedPage === activeMedsTotalPages ? "disabled" : ""}`} onClick={() => activeMedPage < activeMedsTotalPages && setActiveMedPage(activeMedPage + 1)}>
                        &gt;
                      </button>
                    </div>
                  )}
                </div>

                {/* History Meds Panel */}
                <div className="medication-panel history-medication-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4>Medication History <span className="medication-count-chip ghost">{historyMotherMeds.length}</span></h4>
                  <div style={{ flex: 1 }}>
                    {historyMotherMedsPaginated.length > 0 ? (
                      historyMotherMedsPaginated.map((med) => (
                        <div key={med.id} className="medication-copy medication-card history" style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '0.8rem', fontWeight: 600, color: med.status === 'Completed' ? '#059669' : '#dc2626' }}>
                            {med.status}
                          </span>
                          <p><span>Medication Name:</span> {med.medicationName}</p>
                          <p><span>Dosage:</span> {formatDosage(med.dosage)} mg</p>
                          <p><span>Frequency:</span> {med.frequency || "-"}</p>
                          <p><span>Prescribed by:</span> {med.prescribedBy}</p>
                          <p><span>Start/End Date:</span> {med.startDate} to {med.endDate || "-"}</p>
                          {med.reasonStopped && <p style={{ color: '#b91c1c' }}><span>Reason Stopped:</span> {med.reasonStopped}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="medication-copy medication-card history" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                        No medication history found.
                      </div>
                    )}
                  </div>
                  {historyMedsTotalPages > 0 && historyMotherMeds.length > 0 && (
                    <div className="inline-pagination centered">
                      <button className={`pager-btn ${historyMedPage === 1 ? "disabled" : ""}`} onClick={() => historyMedPage > 1 && setHistoryMedPage(historyMedPage - 1)}>
                        &lt;
                      </button>
                      <span className="pager-indicator">{historyMedPage}</span>
                      <button className={`pager-btn ${historyMedPage === historyMedsTotalPages ? "disabled" : ""}`} onClick={() => historyMedPage < historyMedsTotalPages && setHistoryMedPage(historyMedPage + 1)}>
                        &gt;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* INLINE MEDICATION EDIT MODAL */}
            {editRecord && (
              <div className="modal-overlay" style={{ zIndex: 9999 }}>
                <div className="modal-card medication-modal medication-modal-large medication-update-modal">
                  <h2 className="modal-title">UPDATE MEDICATION</h2>
                  <p className="modal-name-text">Mother: <strong>{editRecord.motherName}</strong></p>
                  <div className="modal-form-grid">
                    {editOptions.length > 1 && (
                      <div className="form-span-2">
                        <label>Select Medicine</label>
                        <div className="modal-input-icon">
                          <select
                            value={editRecord.id}
                            onChange={(event) => changeEditTarget(event.target.value)}
                          >
                            {editOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.medicationName} ({formatDosage(item.dosage)} mg)
                              </option>
                            ))}
                          </select>
                          <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}>
                            <ChevronDown size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label>Medication Name</label>
                      <input
                        value={editForm.medicationName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, medicationName: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Dosage (mg)</label>
                      <input
                        value={editForm.dosage}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, dosage: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Frequency</label>
                      <input
                        value={editForm.frequency}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, frequency: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label>End Date</label>
                      <div className="modal-input-icon">
                        <input
                          type="date"
                          value={editForm.endDate}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, endDate: event.target.value }))}
                        />
                        <button
                          type="button"
                          className="modal-icon-trigger"
                          tabIndex={-1}
                          onClick={(event) => {
                            const input = event.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input && typeof input.showPicker === "function") {
                              input.showPicker();
                            }
                          }}
                        >
                          <CalendarDays size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="form-span-2">
                      <label>Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                    </div>
                    <div className="form-span-2">
                      <label>Instructions</label>
                      <textarea
                        value={editForm.instructions}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, instructions: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-outline" onClick={() => { setEditRecord(null); setEditForm(EMPTY_EDIT_FORM); }}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={() => void handleUpdateMedication()} disabled={medMutationLoading}>
                      {medMutationLoading ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INLINE MEDICATION STOP MODAL */}
            {stopRecord && (
              <div className="modal-overlay" style={{ zIndex: 9999 }}>
                <div className="modal-card medication-modal medication-modal-small">
                  <h2 className="modal-title danger">STOP CONFIRMATION</h2>
                  <p className="stop-copy">
                    Select the medicine you want to stop for{" "}
                    <strong>{stopRecord.motherName}</strong>.
                  </p>

                  {stopOptions.length > 1 && (
                    <div className="stop-mode-toggle">
                      <button
                        type="button"
                        className={`stop-mode-btn ${stopMode === "single" ? "active" : ""}`}
                        onClick={() => setStopMode("single")}
                      >
                        Stop One Medicine
                      </button>
                      <button
                        type="button"
                        className={`stop-mode-btn ${stopMode === "all" ? "active" : ""}`}
                        onClick={() => setStopMode("all")}
                      >
                        Stop All Medications
                      </button>
                    </div>
                  )}

                  {stopOptions.length > 1 && stopMode === "single" ? (
                    <div>
                      <label>Select Medicine</label>
                      <div className="modal-input-icon">
                        <select
                          value={selectedStopMedicationId}
                          onChange={(event) => setSelectedStopMedicationId(event.target.value)}
                        >
                          {stopOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.medicationName} ({formatDosage(item.dosage)} mg)
                            </option>
                          ))}
                        </select>
                        <button type="button" className="modal-icon-trigger modal-select-trigger" tabIndex={-1}>
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>
                  ) : stopMode === "all" ? (
                    <div className="stop-all-box">
                      <strong>{stopOptions.length} active medications will be stopped for {stopRecord.motherName}.</strong>
                    </div>
                  ) : (
                    <p className="single-stop-med">
                      <strong>Medicine:</strong> {stopRecord.medicationName} ({formatDosage(stopRecord.dosage)} mg)
                    </p>
                  )}

                  <label>Reason to stop medication</label>
                  <textarea
                    value={stopReason}
                    onChange={(event) => setStopReason(event.target.value)}
                    placeholder="Enter reason"
                  />
                  <div className="modal-actions">
                    <button className="btn-outline" onClick={() => { setStopRecord(null); setStopReason(""); setSelectedStopMedicationId(""); setStopMode("single"); }}>Cancel</button>
                    <button className="btn-primary" onClick={() => void handleStopMedication()} disabled={medMutationLoading}>
                      {medMutationLoading ? "Stopping..." : "Stop"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setSelectedObservationMother(null)}>
                Close
              </button>
            </div>

          </div>
        </div>,
        portalRoot,
      )}
    </div>
  );
}
