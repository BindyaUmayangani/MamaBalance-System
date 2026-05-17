"use client";

import { ManagedUserRow } from "@/lib/admin/types";
import { useState } from "react";

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
  onClose,
  onSave,
}: Props) {
  const [email, setEmail] = useState(admin.personalEmail || admin.email || "");

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
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error);
              }

              onSave({
                ...admin,
                personalEmail: email.trim() || admin.personalEmail,
                region: admin.region,
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
