"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Trash2 } from "lucide-react";

import "@/app/superadmin/styles/userManagement.css";
import "@/app/superadmin/styles/regionManagement.css";
import "@/app/styles/RoleSettingsSupport.css";

import Pagination from "../components/Pagination";
import ModalWrapper from "../educational-content/modals/ModalWrapper";
import AddRegionModal from "./modals/AddRegionModal";
import DeleteRegionModal from "./modals/DeleteRegionModal";
import LoadingState from "@/components/admin/LoadingState";

type ModalType = "add" | "delete" | null;

type RegionRow = {
  id: string;
  name: string;
  doctors: number;
  midwives: number;
  mothers: number;
};

export default function RegionManagementPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const pageSize = 6;

  useEffect(() => {
    async function fetchRegions() {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/regions", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch regions");
        }

        setRegions(data.regions || []);
      } catch (error) {
        console.error(error);
        alert("Failed to load regions.");
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, []);

  const filteredRegions = useMemo(() => {
    return regions.filter((region) =>
      `${region.id} ${region.name}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [regions, search]);

  const totalItems = filteredRegions.length;
  const hasActiveSearch = search.trim().length > 0;

  const paginatedRegions = filteredRegions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="user-page">
      <div className="page-header">
        <div className="role-header">
          <h1>Region Management</h1>
          <p>Configure system regions, monitor regional performance, and manage area assignments.</p>
        </div>

        <button
          className="add-btn"
          onClick={() => setActiveModal("add")}
        >
          + Add Region
        </button>
      </div>

      <div className="top-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by Region ID or Name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading regions..." />
      ) : filteredRegions.length === 0 ? (
        <div className="table-card">
          <div className="doctor-empty-state">
            <div className="doctor-empty-state-icon" aria-hidden="true">
              <MapPin size={24} />
            </div>
            <h3>{hasActiveSearch ? "No matching regions found" : "No regions added yet"}</h3>
            <p>
              {hasActiveSearch
                ? "Try a different region ID or name to find the region you need."
                : "Regions you add here will appear with their assigned doctors, midwives, and mothers."}
            </p>
            <div className="doctor-empty-state-tips">
              <span>{hasActiveSearch ? "Clear the search to see every region again." : "Use Add Region to create the first system region."}</span>
              <span>{hasActiveSearch ? "Search using the region ID or the region name." : "Region totals will update here as users are assigned."}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Region ID</th>
                <th>Region Name</th>
                <th>No. of Doctors</th>
                <th>No. of Midwives</th>
                <th>No. of Mothers</th>
                <th className="actions-col"></th>
              </tr>
            </thead>

            <tbody>
              {paginatedRegions.map((region) => (
                <tr key={region.id}>
                  <td>{region.id}</td>
                  <td>{region.name}</td>
                  <td>{region.doctors}</td>
                  <td>{region.midwives}</td>
                  <td>{region.mothers}</td>
                  <td className="actions">
                    <Trash2
                      title="Delete Region"
                      onClick={() => {
                        setSelectedRegion(region);
                        setActiveModal("delete");
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRegions.length > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      ) : null}

      {activeModal && (
        <ModalWrapper onClose={() => setActiveModal(null)}>
          {activeModal === "add" && (
            <AddRegionModal
              onClose={() => setActiveModal(null)}
              onSave={(newRegion) => {
                setRegions((prev) => [...prev, newRegion]);
                setCurrentPage(1);
                setActiveModal(null);
              }}
            />
          )}

          {activeModal === "delete" && selectedRegion && (
            <DeleteRegionModal
              regionName={selectedRegion.name}
              onClose={() => setActiveModal(null)}
              onDelete={async () => {
                try {
                  const res = await fetch("/api/admin/regions", {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ id: selectedRegion.id }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    throw new Error(data.error || "Failed to delete region");
                  }

                  setRegions((prev) =>
                    prev.filter((item) => item.id !== selectedRegion.id)
                  );

                  setActiveModal(null);
                  setSelectedRegion(null);
                } catch (error) {
                  console.error(error);
                  alert(
                    error instanceof Error
                      ? error.message
                      : "Failed to delete region."
                  );
                }
              }}
            />
          )}
        </ModalWrapper>
      )}
    </div>
  );
}
