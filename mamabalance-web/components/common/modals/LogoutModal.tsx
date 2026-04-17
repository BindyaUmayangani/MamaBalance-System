"use client";

import ModalBase from "./ModalBase";
import styles from "./LogoutModal.module.css";

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
    <ModalBase onClose={onClose} contentClassName={styles.logoutModal}>
      <h2 className={styles.title}>LOG OUT</h2>

      <p className={styles.message}>Are you sure you want to log out?</p>

      <div className={styles.actions}>
        <button className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button className={styles.confirmButton} onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Logging Out..." : "Log Out"}
        </button>
      </div>
    </ModalBase>
  );
}
