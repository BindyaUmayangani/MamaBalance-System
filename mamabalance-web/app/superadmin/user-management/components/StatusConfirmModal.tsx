"use client";

type UserStatus = "active" | "inactive";

type Props = {
  userName: string;
  userLabel: string;
  currentStatus: UserStatus;
  nextStatus: UserStatus;
  isSaving: boolean;
  title?: string;
  description?: string;
  currentStatusLabel?: string;
  nextStatusLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function StatusConfirmModal({
  userName,
  userLabel,
  currentStatus,
  nextStatus,
  isSaving,
  title,
  description,
  currentStatusLabel,
  nextStatusLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  const isActivating = nextStatus === "active";
  const resolvedCurrentStatusLabel =
    currentStatusLabel || (currentStatus === "active" ? "Active" : "Inactive");
  const resolvedNextStatusLabel =
    nextStatusLabel || (nextStatus === "active" ? "Active" : "Inactive");

  return (
    <div className="status-confirm-modal">
      <div className={`status-confirm-icon ${nextStatus}`}>
        <span className="status-dot" aria-hidden="true" />
      </div>
      <h2 className="modal-title">
        {title ||
          (isActivating
            ? `Activate ${userLabel} account?`
            : `Deactivate ${userLabel} account?`)}
      </h2>
      <p>
        {description || (isActivating
          ? `${userName} will be able to use the account again.`
          : `${userName} will be marked inactive and access should be treated as paused.`)}
      </p>

      <div className="status-confirm-summary">
        <span>{userLabel}</span>
        <strong>{userName}</strong>
        <span>Current status</span>
        <strong>{resolvedCurrentStatusLabel}</strong>
        <span>New status</span>
        <strong>{resolvedNextStatusLabel}</strong>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="btn-outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`btn-primary status-confirm-submit ${nextStatus}`}
          disabled={isSaving}
          onClick={onConfirm}
        >
          {isSaving ? "Saving..." : confirmLabel || (isActivating ? "Activate" : "Deactivate")}
        </button>
      </div>
    </div>
  );
}
