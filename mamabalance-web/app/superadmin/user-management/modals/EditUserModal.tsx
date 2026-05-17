"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ManagedUserRow } from "@/lib/admin/types";

type RegionOption = {
  id: string;
  name: string;
};

type Props = {
  config: {
    role: string;
    showRegion: boolean;
  };
  user: ManagedUserRow;
  regionOptions: RegionOption[];
  onClose: () => void;
  onSave: (updatedUser: ManagedUserRow) => void;
};

export default function EditUserModal({
  config,
  user,
  onClose,
  onSave,
}: Props) {
  const [email, setEmail] = useState(user.personalEmail || "");
  const [contact, setContact] = useState(user.contact || "");
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<ManagedUserRow | null>(null);

  if (saveOutcome) {
    return (
      <div className="modal-container success-popup">
        <div className="success-popup-hero">
          <div className="success-popup-icon">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="modal-title success-popup-title">
              Changes saved successfully
            </h2>
            <p className="success-popup-subtitle">
              The user record has been updated and synced with the latest account details.
            </p>
          </div>
        </div>

        <div className="success-summary-card">
          <div className="success-summary-row">
            <span className="success-summary-label">User</span>
            <span className="success-summary-value">{saveOutcome.name}</span>
          </div>
          <div className="success-summary-row">
            <span className="success-summary-label">Email</span>
            <span className="success-summary-value">{saveOutcome.personalEmail}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-primary"
            onClick={() => onSave(saveOutcome)}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="modal-title">
        UPDATE {config.role.toUpperCase()}
      </h2>

      <p className="modal-identity-row">
        <strong>Full Name:</strong> {user.name}
      </p>

      <label>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email"
      />

      <label>Contact Number</label>
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Enter contact number"
      />

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        <button
          className="btn-primary"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);

              const res = await fetch("/api/admin/users?type=update", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  uid: user.uid,
                  email,
                  contact,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || "Failed to update user");
              }

              setSaveOutcome({
                ...user,
                personalEmail: email,
                contact,
                region: user.region,
                status: user.status,
              });
            } catch (error) {
              console.error(error);
              alert(
                error instanceof Error ? error.message : "Failed to update user"
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
}
