"use client";

import {
  CalendarDays,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

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
    ["Full Name", user.name],
    ["Username", user.username],
    ["Personal Email", user.email],
    ["NIC", user.nic],
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

  const summaryItems = [
    { label: "User ID", value: user.userId, icon: <UserRound size={16} /> },
    { label: "Contact", value: user.contact || "-", icon: <Phone size={16} /> },
    { label: "Region", value: user.region || "-", icon: <MapPin size={16} /> },
  ];

  return (
    <div className="modal-container">
      <div className="user-summary-hero">
        <div>
          <p className="user-summary-eyebrow">User profile</p>
          <h2 className="modal-title user-summary-title">{title}</h2>
          <p className="user-summary-subtitle">
            Review account identity, contact details, and region assignment in one place.
          </p>
        </div>

        <div className="user-summary-status-card">
          <span className="user-summary-status-label">Account Status</span>
          <span className={`status ${user.status}`}>
            <span className="status-dot" />
            {user.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="user-summary-highlights">
        {summaryItems.map((item) => (
          <div className="user-summary-highlight-card" key={item.label}>
            <span className="user-summary-highlight-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="user-summary-highlight-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="modal-body-scroll user-summary-scroll">
        <div className="view-details view-user-modal user-summary-grid">
          {[...rows, ...motherRows].map(([label, value]) => (
            <div className="detail-row user-summary-detail-card" key={label}>
              <span className="detail-label">{label}</span>
              <span className="detail-value">
                {label === "Risk Status" ? (
                  <span
                    className={`risk-pill ${String(user.role === "mother" ? user.riskStatus || "" : "").toLowerCase()}`}
                  >
                    {user.role === "mother" ? formatRisk(user.riskStatus) : "-"}
                  </span>
                ) : (
                  value || "-"
                )}
              </span>
            </div>
          ))}

          <div className="detail-row user-summary-detail-card">
            <span className="detail-label">Timeline</span>
            <span className="detail-value user-summary-inline-icon">
              <CalendarDays size={15} />
              {user.createdOn || "-"}
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
