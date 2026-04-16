"use client";

import { useState } from "react";

type RegionRow = {
  id: string;
  name: string;
  doctors: number;
  midwives: number;
  mothers: number;
};

export default function AddRegionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (region: RegionRow) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <h2 className="modal-title">ADD REGION</h2>

      <label>Region Name</label>
      <input
        placeholder="Enter region name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        <button
          className="btn-primary"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);

              const res = await fetch("/api/admin/regions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || "Failed to add region");
              }

              onSave(data.region);
            } catch (error) {
              console.error(error);
              alert(
                error instanceof Error
                  ? error.message
                  : "Failed to add region."
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