"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, Eye, EyeOff } from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import ModalBase from "./ModalBase";
import { firebaseAuth } from "@/lib/firebase/client";

type Props = {
  onClose: () => void;
  onBack: () => void;
};

export default function ChangePasswordModal({
  onClose,
  onBack,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [onClose, success]);

  async function handleSave() {
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const currentUser = firebaseAuth.currentUser;

    if (!currentUser?.email) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalBase onClose={onClose}>
      <div className="change-password-modal">
        {success ? (
          <div className="password-success-state" aria-live="polite">
            <div className="password-success-icon">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="modal-title">Password Updated</h2>
            <p className="profile-message success">
              Your password was changed successfully. This window will close in a
              moment.
            </p>
          </div>
        ) : (
          <>
        <div className="change-password-header">
          <button
            className="modal-back"
            onClick={onBack}
            aria-label="Back to profile"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="modal-title">Change Password</h2>
        </div>

        <label>Current Password</label>
        <div className="password-field">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <span
            className="password-toggle"
            onClick={() => setShowCurrent(!showCurrent)}
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        <label>New Password</label>
        <div className="password-field">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <span
            className="password-toggle"
            onClick={() => setShowNew(!showNew)}
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        <label>Confirm Password</label>
        <div className="password-field">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <span
            className="password-toggle"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {error ? <p className="profile-message error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => void handleSave()}
            disabled={isSubmitting || Boolean(success)}
          >
            {isSubmitting ? "Saving..." : success ? "Updated" : "Save"}
          </button>
        </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}
