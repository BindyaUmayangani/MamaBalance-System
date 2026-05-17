import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./DeleteConfirmContent.module.css";

type Detail = {
  label: string;
  value: ReactNode;
};

type Props = {
  title: string;
  message: ReactNode;
  details?: Detail[];
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmContent({
  title,
  message,
  details = [],
  confirmLabel = "Delete",
  pendingLabel = "Deleting...",
  isPending = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className={styles.content}>
      <div className={styles.hero}>
        <span className={styles.icon} aria-hidden="true">
          <Trash2 size={24} strokeWidth={2.2} />
        </span>

        <div>
          <p className={styles.eyebrow}>Permanent action</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </div>

      <p className={styles.message}>{message}</p>

      {details.length > 0 ? (
        <div className={styles.details}>
          {details.map((detail) => (
            <div className={styles.detailRow} key={detail.label}>
              <span>{detail.label}</span>
              <strong>{detail.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.cancel}
          onClick={onCancel}
          disabled={isPending}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.danger}
          onClick={onConfirm}
          disabled={isPending}
          type="button"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </div>
  );
}
