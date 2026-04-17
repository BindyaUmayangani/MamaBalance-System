"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  regionOptions,
  onClose,
  onSave,
}: Props) {
  const [email, setEmail] = useState(user.personalEmail || "");
  const [contact, setContact] = useState(user.contact || "");
  const [status, setStatus] = useState<"active" | "inactive">(
    user.status === "inactive" ? "inactive" : "active"
  );
  const [saving, setSaving] = useState(false);

  const initialRegionId = useMemo(() => {
    const matched = regionOptions.find(
      (item) => item.name === user.region || item.id === user.region
    );
    return matched?.id || "";
  }, [regionOptions, user.region]);

  const [regionId, setRegionId] = useState(initialRegionId);

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

      {config.showRegion && (
        <>
          <label>Assigned Region</label>
          <div className="field-control">
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
            >
              <option value="" disabled>
                Select region
              </option>
              {regionOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="field-icon" />
          </div>
        </>
      )}

      <label>Status</label>
      <div className="radio-group">
        <label className="radio-option">
          <input
            type="radio"
            name="status"
            checked={status === "active"}
            onChange={() => setStatus("active")}
          />
          <span className="custom-radio" />
          <span className="radio-text">Active</span>
        </label>

        <label className="radio-option">
          <input
            type="radio"
            name="status"
            checked={status === "inactive"}
            onChange={() => setStatus("inactive")}
          />
          <span className="custom-radio" />
          <span className="radio-text">Inactive</span>
        </label>
      </div>

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
                  regionId: config.showRegion ? regionId : undefined,
                  status,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || "Failed to update user");
              }

              const selectedRegionName =
                regionOptions.find((item) => item.id === regionId)?.name ||
                user.region;

              onSave({
                ...user,
                personalEmail: email,
                contact,
                region: config.showRegion ? selectedRegionName : user.region,
                status,
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
