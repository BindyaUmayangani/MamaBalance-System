"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  CreatedCredentials,
  RegionOption,
  StaffCreatePayload,
} from "@/lib/admin/types";

type Props = {
  config: {
    role: string;
    showNIC: boolean;
    showRegion: boolean;
    sendCredentials: boolean;
  };
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  regionOptions: RegionOption[];
  autoRegion?: string;
  hideRegionField?: boolean;
};

export default function AddUserModal({
  config,
  onClose,
  onCreated,
  regionOptions,
  autoRegion,
  hideRegionField,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [nic, setNic] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(autoRegion || "");
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: config.role.toLowerCase() as StaffCreatePayload["role"],
          fullName,
          personalEmail,
          nic,
          contactNumber,
          regionId: selectedRegion,
        } satisfies StaffCreatePayload),
      });

      const payload = (await response.json()) as {
        error?: string;
        credentials?: CreatedCredentials;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create the user.");
      }

      await onCreated();
      setCreatedCredentials(payload.credentials || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the user.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (createdCredentials) {
    return (
      <>
        <h2 className="modal-title">{config.role.toUpperCase()} CREATED</h2>

        <div className="view-details view-user-modal">
          <div className="detail-row">
            <span className="detail-label">User ID</span>
            <span className="detail-value">{createdCredentials.userId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Username</span>
            <span className="detail-value">{createdCredentials.username}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Login Email</span>
            <span className="detail-value">{createdCredentials.loginEmail}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Temporary Password</span>
            <span className="detail-value">{createdCredentials.temporaryPassword}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Credentials Email</span>
            <span className="detail-value">{createdCredentials.deliveryEmail}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Delivery Status</span>
            <span className="detail-value">
              {createdCredentials.deliveryQueued ? "Queued for email delivery" : "Created"}
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="modal-container">
      <h2 className="modal-title">ADD {config.role.toUpperCase()}</h2>

      <div className="modal-body-scroll compact">
        <label>Full Name</label>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Enter full name"
        />

        {config.showNIC ? (
          <>
            <label>NIC</label>
            <input
              value={nic}
              onChange={(event) => setNic(event.target.value)}
              placeholder="Enter NIC"
            />
          </>
        ) : null}

        <label>Current Email</label>
        <input
          type="email"
          value={personalEmail}
          onChange={(event) => setPersonalEmail(event.target.value)}
          placeholder="Enter current email"
        />

        <label>Contact Number</label>
        <input
          value={contactNumber}
          onChange={(event) => setContactNumber(event.target.value)}
          placeholder="+94 71 234 5678"
        />

        {config.showRegion && !hideRegionField ? (
          <>
            <label>Assigned Region</label>
            <div className="field-control">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <option value="">Select Region</option>
                {regionOptions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="field-icon" />
            </div>
          </>
        ) : null}

        {hideRegionField && autoRegion ? (
          <input type="hidden" value={autoRegion} />
        ) : null}

        <div className="field-note">
          Login credentials are generated automatically and queued to the current email after the account is created.
        </div>
      </div>

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
