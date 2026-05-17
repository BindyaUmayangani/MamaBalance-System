"use client";

import { LogOut } from "lucide-react";
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
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <LogOut size={24} strokeWidth={2.2} />
        </span>

        <div>
          <p className={styles.eyebrow}>End session</p>
          <h2 className={styles.title}>Log out?</h2>
        </div>
      </div>

      <p className={styles.message}>
        You will be signed out of MamaBalance and returned to the login page.
      </p>

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
