"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordModal({
  uid,
  name,
  onClose,
  onReset,
}: {
  uid: string;
  name: string;
  onClose: () => void;
  onReset: () => Promise<void> | void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ================= PASSWORD STRENGTH ================= */
  const getStrength = () => {
    if (password.length === 0) return { label: "", level: 0 };

    if (password.length < 6)
      return { label: "Weak", level: 1 };

    if (
      password.length >= 6 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    )
      return { label: "Strong", level: 3 };

    return { label: "Medium", level: 2 };
  };

  const strength = getStrength();

  async function handleResetPassword() {
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Enter and confirm the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          password,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to reset the password.");
      }

      await onReset();
      setSuccess(`Password reset successfully for ${name}.`);
      setPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to reset the password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="modal-title">Reset Admin Password</h2>
      <p className="readonly-field">
        Set a new password for <strong>{name}</strong>.
      </p>

      {/* ================= NEW PASSWORD ================= */}
      <label>New Password</label>
      <div className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
        />

        <span
          className="eye-icon"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </span>
      </div>

      {/* ================= STRENGTH INDICATOR ================= */}
      {strength.label && (
        <div className="password-strength">
          <div className={`strength-bar level-${strength.level}`} />
          <span className={`strength-text ${strength.label.toLowerCase()}`}>
            {strength.label}
          </span>
        </div>
      )}

      {/* ================= CONFIRM PASSWORD ================= */}
      <label>Confirm Password</label>
      <div className="password-input-wrapper">
        <input
          type={showConfirm ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
        />

        <span
          className="eye-icon"
          onClick={() => setShowConfirm(!showConfirm)}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </span>
      </div>

      {error ? <p className="form-message error">{error}</p> : null}
      {success ? <p className="form-message success">{success}</p> : null}

      {/* ================= ACTIONS ================= */}
      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleResetPassword} disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </>
  );
}
