"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown } from "lucide-react";

import { ManagedUserRow, RegionOption } from "@/lib/admin/types";

type Props = {
  admin: ManagedUserRow;
  regionOptions: RegionOption[];
  onClose: () => void;
  onTransferred: () => Promise<void> | void;
};

export default function TransferAdminModal({
  admin,
  regionOptions,
  onClose,
  onTransferred,
}: Props) {
  const currentRegion = useMemo(
    () =>
      regionOptions.find(
        (region) => region.name === admin.region || region.id === admin.region,
      ),
    [admin.region, regionOptions],
  );
  const [targetRegionId, setTargetRegionId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const targetRegionOptions = regionOptions.filter(
    (region) => region.id !== currentRegion?.id,
  );

  async function handleTransfer() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/users?type=transfer-admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: admin.uid,
          targetRegionId,
          reason,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to transfer regional admin.");
      }

      await onTransferred();
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to transfer regional admin.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-container transfer-admin-modal">
      <div className="transfer-admin-scroll">
        <div className="transfer-admin-hero">
          <span className="transfer-admin-icon">
            <ArrowRightLeft size={20} />
          </span>
          <div>
            <h2 className="modal-title">TRANSFER ADMIN</h2>
            <p>
              Move this regional admin to another region and notify them after saving.
            </p>
          </div>
        </div>

        <div className="transfer-admin-summary">
          <div>
            <span>Admin</span>
            <strong>{admin.name}</strong>
          </div>
          <div>
            <span>Current Region</span>
            <strong>{admin.region || "Unassigned"}</strong>
          </div>
        </div>

        <label>Target Region</label>
        <div className="field-control">
          <select
            value={targetRegionId}
            onChange={(event) => setTargetRegionId(event.target.value)}
          >
            <option value="">Select target region</option>
            {targetRegionOptions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="field-icon" />
        </div>

        <label>Transfer Reason</label>
        <textarea
          className="transfer-admin-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for transferring this admin"
          rows={4}
        />

        {error ? <p className="form-message error">{error}</p> : null}
      </div>

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleTransfer}
          disabled={isSaving}
        >
          {isSaving ? "Transferring..." : "Transfer Admin"}
        </button>
      </div>
    </div>
  );
}
