"use client";

import { ManagedMotherRow, ManagedUserRow } from "@/lib/admin/types";

type Props = {
  title: string;
  user: ManagedUserRow | ManagedMotherRow;
  onClose: () => void;
};

export default function UserSummaryModal({ title, user, onClose }: Props) {
  function formatRisk(value: string | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "-";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  const rows = [
    ["User ID", user.userId],
    ["Full Name", user.name],
    ["Username", user.username],
    ["Email", user.email],
    ["Current Email", user.personalEmail || "-"],
    ["Contact", user.contact],
    ["NIC", user.nic],
    ["Region", user.region],
    ["Created On", user.createdOn],
  ];

  const motherRows =
    user.role === "mother"
      ? [
          ["Risk Status", user.riskStatus],
          ["Assigned Midwife", user.assignedMidwife],
          ["Assigned Doctor", user.assignedDoctor],
          ["Last EPDS Score", String(user.lastEpdScore)],
          ["Last EPDS Test Date", user.lastEpdTestDate],
          ["Age", user.age],
          ["Birthdate", user.birthdate],
          ["Address", user.address],
          ["Guardian Name", user.guardianName],
          ["Guardian Contact", user.guardianContact],
          ["Delivery Date", user.deliveryDate],
          ["No of Children", String(user.noOfChildren)],
        ]
      : [];

  return (
    <div className="modal-container">
      <h2 className="modal-title">{title}</h2>

      <div className="modal-body-scroll user-summary-scroll">
        <div className="view-details view-user-modal">

        {/* NORMAL ROWS */}
        {[...rows, ...motherRows].map(([label, value]) => (
          <div className="detail-row" key={label}>
            <span className="detail-label">{label}</span>
            <span className="detail-value">
              {label === "Risk Status" ? (
                <span className={`risk-pill ${String(user.riskStatus || "").toLowerCase()}`}>
                  {formatRisk(user.riskStatus)}
                </span>
              ) : (
                value || "-"
              )}
            </span>
          </div>
        ))}

        {/* ✅ STATUS ROW (CUSTOM UI) */}
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value">
            <span className={`status ${user.status}`}>
              <span className="status-dot" />
              {user.status === "active" ? "Active" : "Inactive"}
            </span>
          </span>
        </div>

        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
