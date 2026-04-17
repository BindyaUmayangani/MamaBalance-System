"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, RotateCcw } from "lucide-react";

import "@/app/superadmin/styles/userManagement.css";
import "@/app/superadmin/styles/adminManagement.css";

import Pagination from "../components/Pagination";
import ModalWrapper from "../educational-content/modals/ModalWrapper";
import AddAdminModal from "./modals/AddAdminModal";
import DeleteAdminModal from "./modals/DeleteAdminModal";
import ResetPasswordModal from "./modals/ResetPasswordModal";
import EditAdminModal from "./modals/EditAdminModal";
import LoadingState from "@/components/admin/LoadingState";
import { useManagedUsers } from "@/components/admin/useManagedUsers";
import { ManagedUserRow } from "@/lib/admin/types";

type ModalType = "add" | "edit" | "delete" | "reset" | null;

export default function AdminManagementPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<ManagedUserRow | null>(null);
  const { users: admins, setUsers: setAdmins, regions, isLoading, error, reload } =
    useManagedUsers<ManagedUserRow>("regionaladmin");

  const pageSize = 6;

  /* ================= SEARCH FILTER ================= */
  const filteredAdmins = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return admins;
    }

    return admins.filter((admin) =>
      [
        admin.userId,
        admin.name,
        admin.username,
        admin.email,
        admin.personalEmail,
        admin.region,
        admin.contact,
        admin.nic,
        admin.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [admins, search]);

  /* ================= PAGINATION ================= */
  const totalItems = filteredAdmins.length;
  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="user-page">
      <div className="page-header">
        <div className="role-header">
          <h1>Regional Admin Management</h1>
          <p>Manage regional administrative staff and their system permissions.</p>
        </div>
        <button
          className="add-btn"
          onClick={() => setActiveModal("add")}
        >
          + Add Admin
        </button>
      </div>

      {/* ================= SEARCH + ADD ROW ================= */}
      <div className="top-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="search"
            name="regional-admin-search"
            placeholder="Search by Admin ID, Name, Username or Region"
            value={search}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ================= TABLE ================= */}
      {isLoading ? (
        <LoadingState label="Loading regional admins..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email Address</th>
                <th>Region</th>
                <th>Status</th>
                <th className="actions-col"></th>
              </tr>
            </thead>

            <tbody>
              {paginatedAdmins.map((admin) => (
                <tr key={admin.uid}>
                  <td>{admin.userId}</td>
                  <td>{admin.name}</td>
                  <td>{admin.username}</td>
                  <td>{admin.email}</td>
                  <td>{admin.region}</td>
                  <td>
                    <span className={`status ${admin.status}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {admin.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="actions">
                    <RotateCcw
                      title="Reset Password"
                      onClick={() => {
                        setSearch("");
                        setCurrentPage(1);
                        setSelectedAdmin(admin);
                        setActiveModal("reset");
                      }}
                    />
                    <Pencil onClick={() => {
                      setSelectedAdmin(admin);
                      setActiveModal("edit");
                    }} />
                    <Trash2 onClick={() => {
                      setSelectedAdmin(admin);
                      setActiveModal("delete");
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* ================= MODALS ================= */}
      {activeModal && (
        <ModalWrapper
          variant="default"
          onClose={() => setActiveModal(null)}
        >
          {activeModal === "add" && (
            <AddAdminModal
              onClose={() => setActiveModal(null)}
              onCreated={reload}
              regionOptions={regions}
            />
          )}

          {activeModal === "edit" && selectedAdmin && (
            <EditAdminModal
              admin={selectedAdmin}
              regionOptions={regions}
              onClose={() => setActiveModal(null)}
              onSave={(updatedAdmin) => {
                setAdmins((prev) =>
                  prev.map((item) =>
                    item.uid === updatedAdmin.uid ? updatedAdmin : item
                  )
                );

                setSelectedAdmin(updatedAdmin);
                setActiveModal(null);
              }}
            />
          )}

          {activeModal === "delete" && selectedAdmin && (
            <DeleteAdminModal
              uid={selectedAdmin.uid}
              name={selectedAdmin.name}
              onClose={() => setActiveModal(null)}
              onDeleted={async () => {
                await reload();
                setActiveModal(null);
                setSelectedAdmin(null);
              }}
            />
          )}

          {activeModal === "reset" && selectedAdmin && (
            <ResetPasswordModal
              uid={selectedAdmin.uid}
              name={selectedAdmin.name}
              onClose={() => setActiveModal(null)}
              onReset={async () => {
                await reload();
              }}
            />
          )}
        </ModalWrapper>
      )}
    </div>
  );
}
