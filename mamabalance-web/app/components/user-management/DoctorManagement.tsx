"use client";

import { Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/styles/RoleSettingsSupport.css";

import { doctorConfig } from "@/app/superadmin/user-management/configs/doctor.config";
import UserTabs from "@/app/superadmin/user-management/components/UserTabs";
import UserTable from "@/app/superadmin/user-management/components/UserTable";
import Pagination from "@/app/superadmin/components/Pagination";

import ModalWrapper from "@/app/superadmin/user-management/modals/ModalWrapper";
import FilterModal from "@/app/superadmin/user-management/modals/FilterModal";
import AddUserModal from "@/app/superadmin/user-management/modals/AddUserModal";
import UserSummaryModal from "@/components/admin/UserSummaryModal";
import LoadingState from "@/components/admin/LoadingState";
import { useManagedUsers } from "@/components/admin/useManagedUsers";
import UserDeleteModal from "@/app/superadmin/user-management/modals/UserDeleteModal";
import { ManagedUserRow } from "@/lib/admin/types";
import EditUserModal from "@/app/superadmin/user-management/modals/EditUserModal";

type RoleType = "superadmin" | "regionaladmin";

type Props = {
  role: RoleType;
  regionId?: string;
  regionName?: string;
};

type ModalType = "add" | "edit" | "view" | "delete" | null;

export default function DoctorManagement({ role, regionId, regionName }: Props) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedUserRow | null>(null);
  const {
    users: allDoctors,
    regions,
    isLoading,
    error,
    reload,
  } = useManagedUsers<ManagedUserRow>("doctor");

  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    userId: true,
    name: true,
    username: true,
    email: true,
    nic: true,
    region: role === "superadmin",
    contact: true,
    createdOn: true,
    status: true,
  });

  const columns = [
    { key: "userId", label: "User ID" },
    { key: "name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email Address" },
    { key: "nic", label: "NIC" },
    { key: "region", label: "Region" },
    { key: "contact", label: "Contact No" },
    { key: "createdOn", label: "Created On" },
    { key: "status", label: "Status" },
  ] as const;

  const filteredByRole = useMemo(() => {
    if (role === "regionaladmin" && regionName) {
      return allDoctors.filter((doc) => doc.region === regionName);
    }
    return allDoctors;
  }, [allDoctors, role, regionName]);

  const searchedData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return filteredByRole;
    }

    return filteredByRole.filter((doc) =>
      [
        doc.userId,
        doc.name,
        doc.username,
        doc.email,
        doc.personalEmail,
        doc.nic,
        doc.region,
        doc.contact,
        doc.createdOn,
        doc.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [filteredByRole, searchTerm]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = searchedData.slice(startIndex, startIndex + PAGE_SIZE);
  const hasActiveSearch = searchTerm.trim().length > 0;

  const tableContent = isLoading ? (
    <LoadingState label="Loading doctors..." />
  ) : error ? (
    <LoadingState label={error} variant="error" />
  ) : (
    <UserTable
      columns={columns}
      data={paginatedData}
      visibleColumns={visibleColumns}
      onView={(row) => {
        setSelectedUser(row);
        setActiveModal("view");
      }}
      onEdit={(row) => {
        setSelectedUser(row);
        setActiveModal("edit");
      }}
      onDelete={(row) => {
        setSelectedUser(row);
        setActiveModal("delete");
      }}
      emptyStateVariant={hasActiveSearch ? "search" : "default"}
      emptyStateTitle={hasActiveSearch ? "No matching doctors found" : "No doctors found yet"}
      emptyStateMessage={
        hasActiveSearch
          ? "Try a different name, ID, username, email, NIC, or clear the current search."
          : "Doctor accounts will appear here once they are created for this workspace."
      }
      emptyStateTips={
        hasActiveSearch
          ? ["Check spelling", "Try fewer keywords", "Clear search"]
          : ["Doctor profile details", "Region assignments", "Account status"]
      }
    />
  );

  return (
    <div className="user-page">
      <div className="page-header">
        <div className="role-header">
          <h1 className={role === "superadmin" ? "" : "page-title"}>
            User Management - Doctors
            {role === "regionaladmin" && regionName && ` (${regionName})`}
          </h1>
          <p>
            Manage doctor accounts, review active records, and keep regional staffing details accurate.
          </p>
        </div>
        <button className="add-btn" onClick={() => setActiveModal("add")}>
          {doctorConfig.addLabel}
        </button>
      </div>

      <div className="top-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by Doctor ID, Name, Username or Specialization"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button className="filter-btn" onClick={() => setShowFilter(true)}>
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="tabs-row">
        <UserTabs active="doctors" role={role} />
      </div>

      {tableContent}

      {!isLoading && !error ? (
        <Pagination
          currentPage={currentPage}
          totalItems={searchedData.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      ) : null}

      {showFilter && (
        <ModalWrapper onClose={() => setShowFilter(false)}>
          <FilterModal
            columns={columns}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            onClose={() => setShowFilter(false)}
          />
        </ModalWrapper>
      )}

      {activeModal && (
        <ModalWrapper
          variant={activeModal === "view" ? "view" : activeModal === "edit" ? "compact" : "default"}
          onClose={() => setActiveModal(null)}
        >
          {activeModal === "add" && (
            <AddUserModal
              config={doctorConfig}
              onCreated={reload}
              regionOptions={regions}
              autoRegion={role === "regionaladmin" ? regionId : undefined}
              hideRegionField={role === "regionaladmin"}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === "edit" && selectedUser && (
            <EditUserModal
              config={doctorConfig}
              user={selectedUser}
              regionOptions={regions}
              onClose={() => setActiveModal(null)}
              onSave={async () => {
                await reload();
                setActiveModal(null);
                setSelectedUser(null);
              }}
            />
          )}

          {activeModal === "view" && selectedUser && (
            <UserSummaryModal
              title="DOCTOR DETAILS"
              user={selectedUser}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === "delete" && selectedUser && (
            <UserDeleteModal
              uid={selectedUser.uid}
              role="Doctor"
              name={selectedUser.name}
              onClose={() => setActiveModal(null)}
              onDeleted={async () => {
                await reload();
                setActiveModal(null);
                setSelectedUser(null);
              }}
            />
          )}
        </ModalWrapper>
      )}
    </div>
  );
}
