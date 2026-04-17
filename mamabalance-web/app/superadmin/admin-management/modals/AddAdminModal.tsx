"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  CreatedCredentials,
  RegionOption,
  StaffCreatePayload,
} from "@/lib/admin/types";

export default function AddAdminModal({
  onClose,
  onCreated,
  regionOptions,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  regionOptions: RegionOption[];
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
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
          role: "regionaladmin",
          fullName: name,
          personalEmail,
          nic: "",
          contactNumber: "",
          regionId: region,
        } satisfies StaffCreatePayload),
      });

      const payload = (await response.json()) as {
        error?: string;
        credentials?: CreatedCredentials;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create the admin.");
      }

      await onCreated();
      setCreatedCredentials(payload.credentials || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the admin.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (createdCredentials) {
    return (
      <>
        <h2 className="modal-title">ADMIN CREATED</h2>

        <div className="view-details view-user-modal">
          <div className="detail-row">
            <span className="detail-label">Admin ID</span>
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
      <h2 className="modal-title">ADD ADMIN</h2>

      <div className="modal-body-scroll compact">
        <label>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />

        <label>Current Email Address</label>
        <input
          type="email"
          placeholder="Enter current email"
          value={personalEmail}
          onChange={(e) => setPersonalEmail(e.target.value)}
        />

        <label>Assign Region</label>
        <div className="field-control">
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Select region</option>
            {regionOptions.map((regionOption) => (
              <option key={regionOption.id} value={regionOption.id}>
                {regionOption.name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="field-icon" />
        </div>

        <div className="field-note">
          The account credentials will be created for you after saving this regional admin.
          You will see the generated admin ID, username, system login email, and temporary password before closing.
        </div>
      </div>

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
