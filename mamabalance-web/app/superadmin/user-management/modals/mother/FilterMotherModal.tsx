import { ChevronDown } from "lucide-react";
import { useState } from "react";

type Filters = {
  region: string;
  riskLevel: string;
  status: string;
};

type Props = {
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  filters: Filters;
  onApplyFilters: (filters: Filters) => void;
  regionOptions?: { id: string; name: string }[];
  onClose: () => void;
};

const COLUMN_LABELS: Record<string, string> = {
  userId: "User ID",
  name: "Name",
  username: "Username",
  email: "Email Address",
  nic: "NIC",
  region: "Region",
  contact: "Contact No",
  riskStatus: "Risk Status",
  assignedMidwife: "Assigned Midwife",
  assignedDoctor: "Assigned Doctor",
  lastEpdScore: "Last EPDS Score",
  birthdate: "Birthdate",
  address: "Address",
  guardianName: "Guardian Name",
  guardianContact: "Guardian Contact No",
  deliveryDate: "Delivery Date",
  noOfChildren: "No of Children",
  createdOn: "Created On",
  status: "Status",
};

export default function FilterMotherModal({
  visibleColumns,
  setVisibleColumns,
  filters,
  onApplyFilters,
  regionOptions = [],
  onClose,
}: Props) {
  const [pendingFilters, setPendingFilters] = useState<Filters>({ ...filters });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setPendingFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="modal-container filter-modal-container">
      <h2 className="modal-title">FILTER BY</h2>

      <div className="filter-content-no-scroll">
        {/* FILTER OPTIONS */}
        <div className="filter-row">
          <div className="field-control">
            <select
              value={pendingFilters.region}
              onChange={(e) => handleFilterChange("region", e.target.value)}
            >
              <option value="All">Region: All</option>
              {regionOptions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="field-icon" size={18} />
          </div>

          <div className="field-control">
            <select
              value={pendingFilters.riskLevel}
              onChange={(e) => handleFilterChange("riskLevel", e.target.value)}
            >
              <option value="All">Risk Level: All</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
            <ChevronDown className="field-icon" size={18} />
          </div>

          <div className="field-control">
            <select
              value={pendingFilters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="All">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="field-icon" size={18} />
          </div>
        </div>

        {/* HIDE COLUMNS */}
        <h3 className="hide-columns-title">HIDE COLUMNS</h3>

        <div className="hide-columns-grid">
          {Object.keys(visibleColumns).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={visibleColumns[key]}
                onChange={() =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
              />
              <span className="checkbox-text">{COLUMN_LABELS[key] ?? key}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => onApplyFilters(pendingFilters)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
