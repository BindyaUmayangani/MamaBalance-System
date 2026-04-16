"use client";

import ModalBase from "./ModalBase";

type Props = {
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export default function LogoutModal({
  onClose,
  onConfirm,
  isSubmitting = false,
}: Props) {
  return (
    <ModalBase onClose={onClose}>
      <h2 className="modal-title danger">LOG OUT</h2>

      <p className="delete-text">Are you sure you want to log out?</p>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Logging Out..." : "Log Out"}
        </button>
      </div>
    </ModalBase>
  );
}
