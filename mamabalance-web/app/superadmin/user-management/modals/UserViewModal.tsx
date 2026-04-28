"use client";

type Props = {
  role: string;
  onClose: () => void;
};

export default function UserViewModal({ role, onClose }: Props) {
  return (
    <>
      <h2 className="modal-title">{role.toUpperCase()} DETAILS</h2>

      {/* ✅ SAME ELEMENT HAS BOTH CLASSES */}
      <div className="view-details view-user-modal">
        <div className="detail-row">
          <span className="detail-label">User ID</span>
          <span className="detail-value">DR01</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Full Name</span>
          <span className="detail-value">Bindya Umayangani</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Username</span>
          <span className="detail-value">BindyaUmayangani</span>
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
          <span className="detail-label">Region</span>
          <span className="detail-value">Homagama</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Contact No</span>
          <span className="detail-value">0702628973</span>
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

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
