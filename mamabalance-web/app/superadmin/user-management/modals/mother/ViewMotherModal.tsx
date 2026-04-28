"use client";

export default function ViewMotherModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h2 className="modal-title">MOTHER DETAILS</h2>

      <div className="view-details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        {/* ================= LEFT COLUMN ================= */}
        <div>
          <div className="detail-row">
            <span className="detail-label">User ID</span>
            <span className="detail-value">MO001</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">Bindya Umayangani</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">NIC</span>
            <span className="detail-value">200012345678</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Personal Email</span>
            <span className="detail-value">bindya@gmail.com</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Contact No</span>
            <span className="detail-value">0702628973</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Region</span>
            <span className="detail-value">Kaduwela</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Birthdate</span>
            <span className="detail-value">2000-06-17</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Address</span>
            <span className="detail-value">
              123, Main Street, Colombo
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Assigned Midwife</span>
            <span className="detail-value">Nimali Perera</span>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div>
          <div className="detail-row">
            <span className="detail-label">Guardian Name</span>
            <span className="detail-value">Iresha Tharangani</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Guardian Contact No</span>
            <span className="detail-value">0702628973</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Last EPDS Score</span>
            <span className="detail-value">11</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Risk Status</span>
            <span className="risk-pill moderate">Moderate</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Assigned Doctor</span>
            <span className="detail-value">Dr. Silva</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Delivery Date</span>
            <span className="detail-value">2025-06-17</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">No of Children</span>
            <span className="detail-value">2</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Created On</span>
            <span className="detail-value">2025-07-17</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="status active">● Active</span>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
