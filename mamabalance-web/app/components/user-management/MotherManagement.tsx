"use client";

import { Search, Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/styles/RoleSettingsSupport.css";

import UserTabs from "@/app/superadmin/user-management/components/UserTabs";
import UserTable from "@/app/superadmin/user-management/components/UserTable";
import Pagination from "@/app/superadmin/components/Pagination";
import ModalWrapper from "@/app/superadmin/user-management/modals/ModalWrapper";

import AddMotherModal from "@/app/superadmin/user-management/modals/mother/AddMotherModal";
import MotherProfileViewModal from "@/components/admin/MotherProfileViewModal";
import MotherObservationModal from "@/components/admin/MotherObservationModal";
import LoadingState from "@/components/admin/LoadingState";
import { useManagedUsers } from "@/components/admin/useManagedUsers";
import FilterMotherModal from "@/app/superadmin/user-management/modals/mother/FilterMotherModal";
import UserDeleteModal from "@/app/superadmin/user-management/modals/UserDeleteModal";
import { ManagedMotherRow, ManagedUserRow } from "@/lib/admin/types";
import EditMotherModal from "@/app/superadmin/user-management/modals/mother/EditMotherModal";

type RoleType = "superadmin" | "regionaladmin";

type Props = {
  role: RoleType;
  regionId?: string;
  regionName?: string;
};

type ModalType = "add" | "edit" | "view" | "observations" | "delete" | "filter" | null;

export default function MotherManagement({ role, regionId, regionName }: Props) {
  const searchParams = useSearchParams();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    region: "All",
    riskLevel: "All",
    status: "All",
  });
  const [localHighlightedUserId, setLocalHighlightedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedMotherRow | null>(null);
  const [isProvisioningSmsLogin, setIsProvisioningSmsLogin] = useState(false);
  const { users: allMothers, regions, isLoading, error, reload } =
    useManagedUsers<ManagedMotherRow>("mother");
  const { users: allMidwives } = useManagedUsers<ManagedUserRow>("midwife");
  const { users: allDoctors } = useManagedUsers<ManagedUserRow>("doctor");

  const pageSize = 6;
  const highlightedUserId = searchParams.get("highlight") || "";
  const activeHighlightedUserId = localHighlightedUserId || highlightedUserId;

  function matchesHighlightedMother(mother: ManagedMotherRow, highlight: string) {
    if (!highlight) {
      return false;
    }

    return mother.uid === highlight || mother.userId === highlight;
  }

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    userId: true,
    name: true,
    username: true,
    email: true,
    nic: true,
    region: role === "superadmin",
    contact: true,
    riskStatus: true,
    assignedMidwife: true,
    assignedDoctor: true,
    lastEpdScore: true,
    age: true,
    birthdate: true,
    address: true,
    guardianName: true,
    guardianContact: true,
    deliveryDate: true,
    noOfChildren: true,
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
    { key: "riskStatus", label: "Risk Status" },
    { key: "assignedMidwife", label: "Assigned Midwife" },
    { key: "assignedDoctor", label: "Assigned Doctor" },
    { key: "lastEpdScore", label: "Last EPDS Score" },
    { key: "age", label: "Age" },
    { key: "birthdate", label: "Birthdate" },
    { key: "address", label: "Address" },
    { key: "guardianName", label: "Guardian Name" },
    { key: "guardianContact", label: "Guardian Contact No" },
    { key: "deliveryDate", label: "Delivery Date" },
    { key: "noOfChildren", label: "No of Children" },
    { key: "createdOn", label: "Created On" },
    { key: "status", label: "Status" },
  ] as const;

  const filteredByRole = useMemo(() => {
    if (role === "regionaladmin" && regionName) {
      return allMothers.filter((m) => m.region === regionName);
    }
    return allMothers;
  }, [allMothers, role, regionName]);

  const filteredData = useMemo(() => {
    let data = filteredByRole;

    if (activeFilters.region !== "All") {
      data = data.filter((m) => m.region === activeFilters.region);
    }
    if (activeFilters.riskLevel !== "All") {
      data = data.filter(
        (m) => m.riskStatus?.toLowerCase() === activeFilters.riskLevel.toLowerCase(),
      );
    }
    if (activeFilters.status !== "All") {
      data = data.filter((m) => m.status?.toLowerCase() === activeFilters.status.toLowerCase());
    }

    return data;
  }, [filteredByRole, activeFilters]);

  const searchedData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return filteredData;
    }

    return filteredData.filter((m) =>
      [
        m.userId,
        m.name,
        m.username,
        m.email,
        m.personalEmail,
        m.nic,
        m.region,
        m.contact,
        m.riskStatus,
        m.assignedMidwife,
        m.assignedDoctor,
        String(m.lastEpdScore),
        m.age,
        m.birthdate,
        m.address,
        m.guardianName,
        m.guardianContact,
        m.deliveryDate,
        String(m.noOfChildren),
        m.createdOn,
        m.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [filteredData, searchTerm]);

  const totalItems = searchedData.length;
  const highlightedIndex = searchedData.findIndex((mother) =>
    matchesHighlightedMother(mother, activeHighlightedUserId),
  );
  const highlightedPage =
    highlightedIndex >= 0 ? Math.floor(highlightedIndex / pageSize) + 1 : null;
  const effectiveCurrentPage = highlightedPage ?? currentPage;
  const paginatedData = searchedData.slice(
    (effectiveCurrentPage - 1) * pageSize,
    effectiveCurrentPage * pageSize,
  );

  useEffect(() => {
    if (!highlightedUserId) {
      return;
    }

    const scrollTimeoutId = window.setTimeout(() => {
      const row = document.querySelector(
        `[data-highlight-keys~="${highlightedUserId}"]`,
      );
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimeoutId = window.setTimeout(() => {
      setLocalHighlightedUserId("");
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("highlight");
      window.history.replaceState({}, "", nextUrl.toString());
    }, 10000);

    return () => {
      window.clearTimeout(scrollTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [effectiveCurrentPage, highlightedUserId]);
  const hasActiveSearch = searchTerm.trim().length > 0;

  const tableContent = isLoading ? (
    <LoadingState label="Loading mothers..." />
  ) : error ? (
    <LoadingState label={error} variant="error" />
  ) : (
    <UserTable
      columns={columns}
      data={paginatedData}
      visibleColumns={visibleColumns}
      highlightedKey={activeHighlightedUserId}
      getHighlightKeys={(row) => [String(row.uid || ""), String(row.userId || "")]}
      onView={(row) => {
        setSelectedUser(row);
        setActiveModal("view");
      }}
      onObserve={(row) => {
        setLocalHighlightedUserId(row.uid || row.userId);
        setSelectedUser(row);
        setActiveModal("observations");
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
      emptyStateTitle={hasActiveSearch ? "No matching mothers found" : "No mothers found yet"}
      emptyStateMessage={
        hasActiveSearch
          ? "Try a different name, ID, username, email, NIC, or clear the current search."
          : "Mother records will appear here once they are created for this workspace."
      }
      emptyStateTips={
        hasActiveSearch
          ? ["Check spelling", "Try fewer keywords", "Clear search"]
          : ["Mother care details", "Assignments", "Latest EPDS summary"]
      }
    />
  );

  return (
    <div className="user-page">
      <div className="page-header">
        <div className="role-header">
          <h1 className={role === "superadmin" ? "" : "page-title"}>
            User Management - Mothers
            {role === "regionaladmin" && regionName && ` (${regionName})`}
          </h1>
          <p>
            Review mother records, assignments, and care details for the families registered in your region.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            className="filter-btn"
            disabled={isProvisioningSmsLogin}
            onClick={async () => {
              try {
                setIsProvisioningSmsLogin(true);

                const response = await fetch("/api/admin/users?type=provision-phone-auth", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({}),
                });

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || "Unable to provision SMS login.");
                }

                await reload();

                const failureSummary =
                  Array.isArray(data.failures) && data.failures.length > 0
                    ? `\nFailed: ${data.failures
                        .slice(0, 5)
                        .map((item: { uid: string; reason: string }) => `${item.uid} (${item.reason})`)
                        .join(", ")}${data.failures.length > 5 ? "..." : ""}`
                    : "";

                alert(
                  `SMS login provisioning finished.\nUpdated: ${data.updated}\nSkipped: ${data.skipped}\nFailed: ${data.failed}${failureSummary}`,
                );
              } catch (provisionError) {
                alert(
                  provisionError instanceof Error
                    ? provisionError.message
                    : "Unable to provision SMS login.",
                );
              } finally {
                setIsProvisioningSmsLogin(false);
              }
            }}
          >
            {isProvisioningSmsLogin ? "Provisioning SMS Login..." : "Provision SMS Login"}
          </button>

          <button className="add-btn" onClick={() => setActiveModal("add")}>
            + Add Mother
          </button>
        </div>
      </div>

      <div className="top-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by Mother ID, Name, Username or Region"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button className="filter-btn" onClick={() => setActiveModal("filter")}>
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="tabs-row">
        <UserTabs active="mothers" role={role} />
      </div>

      {tableContent}

      {!isLoading && !error ? (
        <Pagination
          currentPage={effectiveCurrentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      ) : null}

      {activeModal === "add" && (
        <ModalWrapper variant="mother" onClose={() => setActiveModal(null)}>
          <AddMotherModal
            onCreated={reload}
            regionOptions={regions}
            midwifeOptions={allMidwives}
            doctorOptions={allDoctors}
            autoRegion={role === "regionaladmin" ? regionId : undefined}
            hideRegionField={role === "regionaladmin"}
            onClose={() => setActiveModal(null)}
          />
        </ModalWrapper>
      )}

      {activeModal === "edit" && selectedUser && (
        <ModalWrapper variant="view" onClose={() => setActiveModal(null)}>
          <EditMotherModal
            mother={selectedUser}
            regionOptions={regions}
            midwifeOptions={allMidwives}
            doctorOptions={allDoctors}
            onClose={() => setActiveModal(null)}
            onSave={async () => {
              await reload();
              setActiveModal(null);
              setSelectedUser(null);
            }}
          />
        </ModalWrapper>
      )}

      {activeModal === "view" && selectedUser && (
        <ModalWrapper variant="mother" onClose={() => setActiveModal(null)}>
          <MotherProfileViewModal
            mother={selectedUser}
            onClose={() => setActiveModal(null)}
          />
        </ModalWrapper>
      )}

      {activeModal === "observations" && selectedUser && (
        <MotherObservationModal
          mother={selectedUser}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "filter" && (
        <ModalWrapper variant="filter" onClose={() => setActiveModal(null)}>
          <FilterMotherModal
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            filters={activeFilters}
            onApplyFilters={(newFilters) => {
              setActiveFilters(newFilters);
              setCurrentPage(1);
              setActiveModal(null);
            }}
            regionOptions={regions}
            onClose={() => setActiveModal(null)}
          />
        </ModalWrapper>
      )}

      {activeModal === "delete" && selectedUser && (
        <ModalWrapper onClose={() => setActiveModal(null)}>
          <UserDeleteModal
            uid={selectedUser.uid}
            role="Mother"
            name={selectedUser.name}
            onClose={() => setActiveModal(null)}
            onDeleted={async () => {
              await reload();
              setActiveModal(null);
              setSelectedUser(null);
            }}
          />
        </ModalWrapper>
      )}
    </div>
  );
}
