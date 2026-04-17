"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, Eye, History, Pencil, Plus, Search, SquareX } from "lucide-react";
import LoadingState from "@/components/admin/LoadingState";
import Pagination from "@/app/superadmin/components/Pagination";
import "@/app/doctor/styles/MedicationManagement.css";
import "@/app/doctor/styles/AssignedMothers.css";

type MedicationStatus = "Active" | "Completed" | "Stopped";

type MedicationRecord = {
  id: string;
  motherName: string;
  motherId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  updatedAt: string;
  status: MedicationStatus;
  notes: string;
  instructions: string;
  reasonStopped?: string;
};

type MotherProfile = {
  id: string;
  name: string;
  username: string;
  riskLevel: "Low" | "Moderate" | "High";
};

type MedicineInput = {
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  instructions: string;
};

type AddMedicationForm = {
  motherQuery: string;
  medicines: MedicineInput[];
};

type EditMedicationForm = MedicineInput;

type StopMode = "single" | "all";

const EMPTY_MEDICINE: MedicineInput = {
  medicationName: "",
  dosage: "",
  frequency: "",
  startDate: "",
  endDate: "",
  notes: "",
  instructions: "",
};

const EMPTY_ADD_FORM: AddMedicationForm = {
  motherQuery: "",
  medicines: [{ ...EMPTY_MEDICINE }],
};

const EMPTY_EDIT_FORM: EditMedicationForm = {
  ...EMPTY_MEDICINE,
};

function findMother(query: string, mothers: MotherProfile[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    mothers.find(
      (mother) =>
        mother.name.toLowerCase() === normalized ||
        mother.username.toLowerCase() === normalized ||
        mother.id.toLowerCase() === normalized,
    ) ||
    mothers.find(
      (mother) =>
        mother.name.toLowerCase().includes(normalized) ||
        mother.username.toLowerCase().includes(normalized) ||
        mother.id.toLowerCase().includes(normalized),
    ) ||
    null
  );
}

function formatDosage(dosage: string) {
  return dosage.replace(/mg/gi, "").trim();
}

export default function MedicationManagementWorkspace() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [mothers, setMothers] = useState<MotherProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/doctor/medications");
      const data = await response.json();
      setRecords(data.medications || []);
      setMothers(data.mothers || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [viewRecord, setViewRecord] = useState<MedicationRecord | null>(null);
  const [editRecord, setEditRecord] = useState<MedicationRecord | null>(null);
  const [stopRecord, setStopRecord] = useState<MedicationRecord | null>(null);
  const [historyMother, setHistoryMother] = useState<MotherProfile | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [addForm, setAddForm] = useState<AddMedicationForm>(EMPTY_ADD_FORM);
  const [editForm, setEditForm] = useState<EditMedicationForm>(EMPTY_EDIT_FORM);
  const [stopReason, setStopReason] = useState("");
  const [selectedStopMedicationId, setSelectedStopMedicationId] = useState("");
  const [stopMode, setStopMode] = useState<StopMode>("single");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchedMother = useMemo(() => findMother(addForm.motherQuery, mothers), [addForm.motherQuery, mothers]);
  const editOptions = editRecord
    ? records.filter((item) => item.motherId === editRecord.motherId)
    : [];
  const stopOptions = stopRecord
    ? records.filter((item) => item.motherId === stopRecord.motherId && item.status === "Active")
    : [];
  const viewRelatedRecords = viewRecord
    ? records.filter((item) => item.motherId === viewRecord.motherId)
    : [];
  const selectedHistoryRecords = historyMother
    ? records.filter((item) => item.motherId === historyMother.id)
    : [];
  const filteredRecords = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return records
      .filter((item) =>
        `${item.id} ${item.motherName} ${item.motherId} ${item.medicationName} ${item.prescribedBy}`
          .toLowerCase()
          .includes(search),
      )
      .filter((item) => (statusFilter === "All" ? true : item.status === statusFilter));
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const startItem = filteredRecords.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, filteredRecords.length);

  const getStatusClass = (status: MedicationStatus) => {
    if (status === "Active") return "active";
    if (status === "Stopped") return "stopped";
    return "completed";
  };

  const openEdit = (record: MedicationRecord) => {
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

  const openStop = (record: MedicationRecord) => {
    if (record.status !== "Active") return;
    const activeForMother = records.filter((item) => item.motherId === record.motherId && item.status === "Active");
    setStopRecord(record);
    setSelectedStopMedicationId(activeForMother.length > 0 ? activeForMother[0].id : record.id);
    setStopMode("single");
    setStopReason("");
  };

  const openHistory = (record: MedicationRecord) => {
    setViewRecord(null);
    setStatusFilter("All");
    setSearchTerm(record.motherName);
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.querySelector(".med-table-card")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const changeEditTarget = (medicationId: string) => {
    const target = records.find((item) => item.id === medicationId);
    if (!target) return;
    setEditRecord(target);
    setEditForm({
      medicationName: target.medicationName,
      dosage: formatDosage(target.dosage),
      frequency: target.frequency,
      startDate: target.startDate,
      endDate: target.endDate,
      notes: target.notes,
      instructions: target.instructions,
    });
  };

  const updateAddMedicine = (
    index: number,
    key: keyof MedicineInput,
    value: string,
  ) => {
    setAddForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, medicineIndex) =>
        medicineIndex === index ? { ...medicine, [key]: value } : medicine,
      ),
    }));
  };

  const addMedicineRow = () => {
    setAddForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { ...EMPTY_MEDICINE }],
    }));
  };

  const removeMedicineRow = (index: number) => {
    setAddForm((prev) => ({
      ...prev,
      medicines:
        prev.medicines.length === 1
          ? prev.medicines
          : prev.medicines.filter((_, medicineIndex) => medicineIndex !== index),
    }));
  };

  const saveAdd = async () => {
    if (!matchedMother || isSubmitting) return;
    const validMedicines = addForm.medicines.filter(
      (medicine) => medicine.medicationName && medicine.dosage,
    );
    if (validMedicines.length === 0) return;

    setIsSubmitting(true);
    try {
      await fetch("/api/doctor/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motherUid: matchedMother.id,
          medicines: validMedicines,
        }),
      });
      await fetchData();
      setAddForm(EMPTY_ADD_FORM);
      setShowAdd(false);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const saveEdit = async () => {
    if (!editRecord || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch("/api/doctor/medications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: editRecord.id,
          action: "UPDATE",
          medicationName: editForm.medicationName,
          dosage: editForm.dosage,
          frequency: editForm.frequency,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          notes: editForm.notes,
          instructions: editForm.instructions,
        }),
      });
      await fetchData();
      setEditRecord(null);
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const stopMedication = async () => {
    if (!stopRecord || isSubmitting) return;
    if (stopMode === "single" && !selectedStopMedicationId) return;

    setIsSubmitting(true);
    try {
      const idsToStop = stopMode === "all"
        ? stopOptions.map((opt) => opt.id)
        : [selectedStopMedicationId];

      await Promise.all(idsToStop.map((id) =>
        fetch("/api/doctor/medications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicationId: id,
            action: "STOP",
            reasonStopped: stopReason,
          }),
        })
      ));
      
      await fetchData();
      setStopRecord(null);
      setSelectedStopMedicationId("");
      setStopMode("single");
      setStopReason("");
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="medication-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Medication Management</h1>
          <p>Manage active prescriptions, medication changes, and treatment history for assigned mothers.</p>
        </div>
        <button className="add-btn" onClick={() => setShowAdd(true)}>
          + Add New Medication
        </button>
      </div>

      <div className="med-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by medication, mother, or prescription ID"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="med-filter-wrap">
          <select
            className="med-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Status: All</option>
            <option value="Active">Status: Active</option>
            <option value="Completed">Status: Completed</option>
            <option value="Stopped">Status: Stopped</option>
          </select>
          <span className="filter-select-icon" aria-hidden="true">
            <ChevronDown size={18} strokeWidth={2.4} />
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading medications..." />
      ) : (
        <>
          <div className="med-table-card">
            {paginatedRecords.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  <Search size={26} strokeWidth={2.2} />
                </div>
                <h3>
                  {searchTerm !== "" || statusFilter !== "All"
                    ? "No matching prescribed medications found"
                    : "No medications prescribed yet"}
                </h3>
                <p>
                  {searchTerm !== "" || statusFilter !== "All"
                    ? "Try a different search term, mother ID, or clear the current filters."
                    : "Active and completed prescriptions assigned by doctors will appear here."}
                </p>
              </div>
            ) : (
              <table className="med-table">
                <thead>
                  <tr>
                    <th>Medication ID</th>
                    <th>Mother</th>
                    <th>Medication</th>
                    <th>Dosage (mg)</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Updated On</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecords.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.motherName}</td>
                      <td>{item.medicationName}</td>
                      <td>{formatDosage(item.dosage)}</td>
                      <td>{item.startDate}</td>
                      <td>{item.endDate || "-"}</td>
                      <td>
                        <span className={`med-status ${getStatusClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td>{item.updatedAt}</td>
                      <td>
                        <div className="med-actions">
                          <button
                            type="button"
                            className="icon-btn view"
                            title="View details"
                            onClick={() => setViewRecord(item)}
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn edit"
                            title="Edit medication"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn stop"
                            title={item.status === "Active" ? "Stop medication" : "Stop unavailable"}
                            disabled={item.status !== "Active"}
                            onClick={() => openStop(item)}
                          >
                            <SquareX size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            currentPage={safeCurrentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {viewRecord && (
        <div className="modal-overlay">
          <div className="modal-card medication-view-modal">
            <div className="med-view-hero">
              <div>
                <p className="med-view-label">Mother</p>
                <h2 className="modal-title med-view-title">{viewRecord.motherName}</h2>
                <p className="med-view-subtitle">Current prescription details and medication progress</p>
              </div>
              <span className={`med-status ${getStatusClass(viewRecord.status)}`}>{viewRecord.status}</span>
            </div>

            <div className="med-view-summary">
              <div className="med-view-summary-card">
                <span className="med-view-summary-label">Current Medication</span>
                <strong>{viewRecord.medicationName}</strong>
                <p>{formatDosage(viewRecord.dosage)} mg</p>
              </div>
              <div className="med-view-summary-card">
                <span className="med-view-summary-label">Mother History</span>
                <strong>{viewRelatedRecords.length} prescriptions</strong>
                <p>{viewRelatedRecords.filter((item) => item.status === "Active").length} active right now</p>
              </div>
            </div>

            <div className="med-view-grid med-view-grid-2">
              <div className="med-view-block">
                <span className="med-view-field">Medication ID</span>
                <p>{viewRecord.id}</p>
              </div>
              <div className="med-view-block">
                <span className="med-view-field">Prescribed By</span>
                <p>{viewRecord.prescribedBy}</p>
              </div>
              <div className="med-view-block">
                <span className="med-view-field">Dosage</span>
                <p>{formatDosage(viewRecord.dosage)} mg</p>
              </div>
              <div className="med-view-block">
                <span className="med-view-field">Frequency</span>
                <p>{viewRecord.frequency}</p>
              </div>
              <div className="med-view-block">
                <span className="med-view-field">Start Date</span>
                <p>{viewRecord.startDate}</p>
              </div>
              <div className="med-view-block">
                <span className="med-view-field">End Date</span>
                <p>{viewRecord.endDate || "-"}</p>
              </div>
              <div className="med-view-block med-view-block-full">
                <span className="med-view-field">Instructions</span>
                {viewRecord.instructions ? (
                  <ul className="bullet-list">
                    {viewRecord.instructions.split("\n").filter((line) => line.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                ) : <p>-</p>}
              </div>
              <div className="med-view-block med-view-block-full">
                <span className="med-view-field">Notes</span>
                {viewRecord.notes ? (
                  <ul className="bullet-list">
                    {viewRecord.notes.split("\n").filter((line) => line.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                ) : <p>-</p>}
              </div>
              {viewRecord.reasonStopped && (
                <div className="med-view-block med-view-block-full">
                  <span className="med-view-field">Reason Stopped</span>
                  <p>{viewRecord.reasonStopped}</p>
                </div>
              )}
            </div>

            <div className="mother-history-preview">
              <div className="mother-history-preview-head">
                <h3>Mother Medication History</h3>
                <button className="btn-outline history-btn" onClick={() => openHistory(viewRecord)}>
                  <History size={16} /> View Full History
                </button>
              </div>
              <div className="mother-history-list">
                {viewRelatedRecords.slice(0, 3).map((item) => (
                  <div className="mother-history-item" key={item.id}>
                    <strong>{item.medicationName}</strong>
                    <span>{formatDosage(item.dosage)} mg</span>
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setViewRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card medication-modal medication-modal-large medication-add-modal">
            <h2 className="modal-title">ADD NEW MEDICATION</h2>
            <div className="modal-form-grid">
              <div className="form-span-2">
                <label>Mother (Name, Username, or ID)</label>
                <input
                  placeholder="Search mother by name, username, or ID"
                  value={addForm.motherQuery}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, motherQuery: event.target.value }))}
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
                    <span className="matched-mother-text">Enter a valid mother name, username, or ID</span>
                  )}
                </div>
              </div>

              <div className="form-span-2 medicine-list">
                {addForm.medicines.map((medicine, index) => (
                  <div className="medicine-entry" key={index}>
                    <div className="medicine-entry-head">
                      <h4>Medicine {index + 1}</h4>
                      {addForm.medicines.length > 1 && (
                        <button
                          type="button"
                          className="remove-med-btn"
                          onClick={() => removeMedicineRow(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="medicine-grid">
                      <div>
                        <label>Medication Name</label>
                        <input
                          value={medicine.medicationName}
                          onChange={(event) => updateAddMedicine(index, "medicationName", event.target.value)}
                        />
                      </div>

                      <div>
                        <label>Dosage (mg)</label>
                        <input
                          value={medicine.dosage}
                          onChange={(event) => updateAddMedicine(index, "dosage", event.target.value)}
                        />
                      </div>

                      <div>
                        <label>Frequency</label>
                        <input
                          value={medicine.frequency}
                          onChange={(event) => updateAddMedicine(index, "frequency", event.target.value)}
                        />
                      </div>

                      <div>
                        <label>Start Date</label>
                        <div className="modal-input-icon">
                          <input
                            type="date"
                            value={medicine.startDate}
                            onChange={(event) => updateAddMedicine(index, "startDate", event.target.value)}
                          />
                          <button
                            type="button"
                            className="modal-icon-trigger"
                            tabIndex={-1}
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              if (input && typeof input.showPicker === "function") {
                                input.showPicker();
                              }
                            }}
                          >
                            <CalendarDays size={18} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label>End Date</label>
                        <div className="modal-input-icon">
                          <input
                            type="date"
                            value={medicine.endDate}
                            onChange={(event) => updateAddMedicine(index, "endDate", event.target.value)}
                          />
                          <button
                            type="button"
                            className="modal-icon-trigger"
                            tabIndex={-1}
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
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
                          value={medicine.notes}
                          onChange={(event) => updateAddMedicine(index, "notes", event.target.value)}
                        />
                      </div>

                      <div className="form-span-2">
                        <label>Instructions</label>
                        <textarea
                          value={medicine.instructions}
                          onChange={(event) => updateAddMedicine(index, "instructions", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className="add-more-med-btn" onClick={addMedicineRow}>
                  <Plus size={16} /> Add Another Medicine
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAdd}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <div className="modal-overlay">
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
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
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
              <button className="btn-outline" onClick={() => setEditRecord(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {stopRecord && (
        <div className="modal-overlay">
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
              <button className="btn-outline" onClick={() => setStopRecord(null)}>Cancel</button>
              <button className="btn-primary" onClick={stopMedication}>Stop</button>
            </div>
          </div>
        </div>
      )}

      {historyMother && (
        <div className="modal-overlay">
          <div className="modal-card medication-view-modal">
            <div className="med-view-hero">
              <div>
                <p className="med-view-label">Medication History</p>
                <h2 className="modal-title med-view-title">{historyMother.name}</h2>
                <p className="med-view-subtitle">Full medication history for this mother</p>
              </div>
              <span className={`risk-pill ${historyMother.riskLevel.toLowerCase()}`}>{historyMother.riskLevel} Risk</span>
            </div>

            <div className="history-modal-list">
              {selectedHistoryRecords.map((item) => (
                <div className="history-modal-item" key={item.id}>
                  <div>
                    <strong>{item.medicationName}</strong>
                    <p>{formatDosage(item.dosage)} mg • {item.frequency}</p>
                  </div>
                  <div className="history-modal-meta">
                    <span className={`med-status ${getStatusClass(item.status)}`}>{item.status}</span>
                    <span>{item.startDate} - {item.endDate || "Present"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setHistoryMother(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
