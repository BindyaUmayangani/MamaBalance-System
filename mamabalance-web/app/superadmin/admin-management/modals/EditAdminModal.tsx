"use client";

import { ManagedUserRow } from "@/lib/admin/types";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type RegionOption = {
  id: string;
  name: string;
};

type Props = {
  admin: ManagedUserRow;
  regionOptions?: RegionOption[];
  onClose: () => void;
  onSave: (updatedAdmin: ManagedUserRow) => void;
};

export default function EditAdminModal({
  admin,
  regionOptions = [],
  onClose,
  onSave,
}: Props) {
  const [email, setEmail] = useState(admin.personalEmail || admin.email || "");

  const initialRegionId = useMemo(() => {
    const matchedRegion = regionOptions.find(
      (item) => item.name === admin.region || item.id === admin.region
    );

    return matchedRegion?.id || "";
  }, [admin.region, regionOptions]);

  const [regionId, setRegionId] = useState(initialRegionId);

  return (
    <>
      <h2 className="modal-title">UPDATE ADMIN</h2>

      <p className="modal-identity-row">
        <strong>Full Name:</strong> {admin.name}
      </p>

      <label>Current Email Address</label>
      <input
        type="email"
        value={email}
        placeholder="Enter email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Assigned Region</label>
      <div className="field-control">
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
        >
          <option value="" disabled>
            Select region
          </option>

          {regionOptions.length > 0 ? (
            regionOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))
          ) : (
            <>
              <option value="RG001">Kaduwela</option>
              <option value="RG002">Homagama</option>
              <option value="RG003">Maharagama</option>
              <option value="RG004">Kesbewa</option>
            </>
          )}
        </select>
        <ChevronDown size={18} className="field-icon" />
      </div>

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>

        <button
          className="btn-primary"
          onClick={async () => {
            try {
              const res = await fetch("/api/admin/users?type=update", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  uid: admin.uid,
                  email,
                  regionId,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error);
              }

              onSave({
                ...admin,
                personalEmail: email.trim() || admin.personalEmail,
                region:
                  regionOptions.find((item) => item.id === regionId)?.name ||
                  admin.region,
              });
            } catch (err) {
              console.error(err);
              alert("Update failed");
            }
          }}
        >
          Save
        </button>
      </div>
    </>
  );
}
