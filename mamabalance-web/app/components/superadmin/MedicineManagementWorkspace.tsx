"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import Pagination from "@/app/superadmin/components/Pagination";
import "@/app/superadmin/styles/medicineManagement.css";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/styles/RoleSettingsSupport.css";
import {
  MEDICINE_CATEGORIES,
  MEDICINE_FORMS,
  MEDICINE_STATUSES,
  type MedicineForm,
  type MedicinePayload,
  type MedicineRecord,
  type MedicineStatus,
} from "@/lib/medicine/types";

type ModalMode = "create" | "edit" | "view" | "delete" | null;

type Props = {
  readOnly?: boolean;
  heading?: string;
  description?: string;
};

const EMPTY_FORM: MedicinePayload = {
  brandName: "",
  genericName: "",
  form: "tablet",
  category: "",
  defaultNotes: "",
  status: "active",
};

export default function MedicineManagementWorkspace({
  readOnly = false,
  heading = "Medicine Management",
  description = "Manage the system medicine catalog used across postpartum prescriptions.",
}: Props) {
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineRecord | null>(null);
  const [form, setForm] = useState<MedicinePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 6;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const medicinesResponse = await fetch("/api/admin/medicines", {
        cache: "no-store",
      });

      const medicinesPayload = (await medicinesResponse.json()) as {
        medicines?: MedicineRecord[];
        error?: string;
      };

      if (!medicinesResponse.ok) {
        throw new Error(medicinesPayload.error || "Unable to load medicines.");
      }

      setMedicines(medicinesPayload.medicines || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to load ${readOnly ? "medicine library" : "medicine management"}.`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [readOnly]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const filteredMedicines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return medicines.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${item.medicineId} ${item.displayName} ${item.searchText}`
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" ? true : item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [medicines, searchTerm, statusFilter, categoryFilter]);

  const currentItems = filteredMedicines;
  const totalPages = Math.max(1, Math.ceil(currentItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = currentItems.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelectedMedicine(null);
    setModalMode("create");
  }

  function openEdit(medicine: MedicineRecord) {
    setSelectedMedicine(medicine);
    setForm({
      brandName: medicine.brandName,
      genericName: medicine.genericName,
      form: medicine.form,
      category: medicine.category,
      defaultNotes: medicine.defaultNotes,
      status: medicine.status,
    });
    setModalMode("edit");
  }

  function closeModal() {
    if (submitting) return;
    setModalMode(null);
    setSelectedMedicine(null);
    setForm(EMPTY_FORM);
  }

  async function saveMedicine() {
    if (submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/medicines", {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          modalMode === "edit" && selectedMedicine
            ? { id: selectedMedicine.id, ...form }
            : form,
        ),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save medicine.");
      }

      await loadData();
      closeModal();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save medicine.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteMedicine() {
    if (!selectedMedicine || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/medicines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMedicine.id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete medicine.");
      }

      await loadData();
      closeModal();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete medicine.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="medicine-page">
      <div className="medicine-header">
        <div className="role-header">
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>

        {!readOnly && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Medicine
          </button>
        )}
      </div>

      <div className="medicine-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by medicine ID, generic name, or brand name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="medicine-filters">
          <div className="medicine-filter-select">
            <div className="field-control medicine-filter-control">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All Categories</option>
                {MEDICINE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <span className="field-icon medicine-filter-icon" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </div>
          </div>

          <div className="field-control medicine-filter-control">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              {MEDICINE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
            <span className="field-icon medicine-filter-icon" aria-hidden="true">
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading medicine management..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="table-card">
            {paginatedItems.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  <Search size={26} strokeWidth={2.2} />
                </div>
                <h3>
                  {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                    ? "No matching medicines found"
                    : "No medicines yet"}
                </h3>
                <p>
                  {readOnly
                    ? "No medicines are available in the system catalog yet."
                    : "Create medicines here so doctors can select them from the system list."}
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Medicine ID</th>
                    <th>Medicine</th>
                    <th>Form</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedItems as MedicineRecord[]).map((item) => (
                    <tr key={item.id}>
                      <td>{item.medicineId}</td>
                      <td>
                        <div className="medicine-name-cell">
                          <strong>{item.genericName}</strong>
                          <span>{item.brandName}</span>
                        </div>
                      </td>
                      <td>{item.formLabel}</td>
                      <td>{item.category}</td>
                      <td>
                        <span className={`status ${item.status}`}>
                          <span className="status-dot" aria-hidden="true" />
                          {item.statusLabel}
                        </span>
                      </td>
                      <td>{item.updatedAt}</td>
                      <td className="actions-col actions-cell">
                        <div className="actions">
                          <Eye
                            className="icon-view"
                            title="View medicine"
                            onClick={() => {
                              setSelectedMedicine(item);
                              setModalMode("view");
                            }}
                          />
                          {!readOnly && (
                            <>
                              <Pencil
                                className="edit-icon"
                                title="Edit medicine"
                                onClick={() => openEdit(item)}
                              />
                              <Trash2
                                className="delete-icon"
                                title="Delete medicine"
                                onClick={() => {
                                  setSelectedMedicine(item);
                                  setModalMode("delete");
                                }}
                              />
                            </>
                          )}
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
            totalItems={currentItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {modalMode && (
        <div className="modal-overlay">
          <div className="modal-card medicine-modal">
            {modalMode === "delete" && selectedMedicine ? (
              <>
                <h2 className="modal-title danger">DELETE MEDICINE</h2>

                <p style={{ marginTop: "12px", fontSize: "0.9rem" }}>
                  Are you sure you want to delete the medicine{" "}
                  <strong>{selectedMedicine.brandName}</strong>?
                </p>

                <div className="modal-actions">
                  <button className="btn-close" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>

                  <button className="btn-danger" onClick={() => void deleteMedicine()} disabled={submitting}>
                    {submitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            ) : modalMode === "view" && selectedMedicine ? (
              <>
                <h2 className="modal-title">Medicine Details</h2>
                <div className="medicine-view-grid">
                  <div>
                    <span className="medicine-view-label">Medicine ID</span>
                    <strong>{selectedMedicine.medicineId}</strong>
                  </div>
                  <div>
                    <span className="medicine-view-label">Status</span>
                    <strong>{selectedMedicine.statusLabel}</strong>
                  </div>
                  <div>
                    <span className="medicine-view-label">Generic Name</span>
                    <strong>{selectedMedicine.genericName}</strong>
                  </div>
                  <div>
                    <span className="medicine-view-label">Brand Name</span>
                    <strong>{selectedMedicine.brandName}</strong>
                  </div>
                  <div>
                    <span className="medicine-view-label">Category</span>
                    <strong>{selectedMedicine.category}</strong>
                  </div>
                  <div>
                    <span className="medicine-view-label">Form</span>
                    <strong>{selectedMedicine.formLabel}</strong>
                  </div>
                  <div className="full">
                    <span className="medicine-view-label">Default Note</span>
                    <p>{selectedMedicine.defaultNotes || "-"}</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-outline" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title">
                  {modalMode === "create"
                    ? "Add Medicine"
                    : "Update Medicine"}
                </h2>

                <div className="modal-form-grid medicine-form-grid">
                  <div>
                    <label>Generic Name</label>
                    <input
                      value={form.genericName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, genericName: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label>Brand Name</label>
                    <input
                      value={form.brandName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, brandName: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label>Form</label>
                    <div className="field-control medicine-select-control">
                      <select
                        value={form.form}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            form: event.target.value as MedicineForm,
                          }))
                        }
                      >
                        {MEDICINE_FORMS.map((item) => (
                          <option key={item} value={item}>
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </option>
                        ))}
                      </select>
                      <span className="field-icon medicine-select-icon" aria-hidden="true">
                        <ChevronDown size={18} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <label>Category</label>
                    <div className="field-control medicine-select-control">
                      <select
                        value={form.category}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                      >
                        <option value="" disabled>
                          Select Category
                        </option>
                        {MEDICINE_CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <span className="field-icon medicine-select-icon" aria-hidden="true">
                        <ChevronDown size={18} />
                      </span>
                    </div>
                  </div>
                  <div className="form-span-2">
                    <label>Default Note</label>
                    <textarea
                      className="medicine-notes-textarea"
                      rows={4}
                      value={form.defaultNotes}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          defaultNotes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-span-2 medicine-status-row">
                    <label>Status</label>
                    <div className="radio-group">
                      {MEDICINE_STATUSES.map((item) => (
                        <label className="radio-option" key={item}>
                          <input
                            type="radio"
                            name="medicine-status"
                            checked={form.status === item}
                            onChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                status: item as MedicineStatus,
                              }))
                            }
                          />
                          <span className="custom-radio" />
                          <span className="radio-text">
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-outline" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => void saveMedicine()}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
