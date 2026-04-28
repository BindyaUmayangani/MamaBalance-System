"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import "@/app/forgot-password/forgot-password.css";

type Step = 1 | 2 | 3;

function buildOtpArray() {
  return ["", "", "", "", "", ""];
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(buildOtpArray());
  const [requestId, setRequestId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = otpDigits.join("");

  function resetMessages() {
    setError("");
    setSuccess("");
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = (await response.json()) as {
        error?: string;
        requestId?: string | null;
        maskedEmail?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to send OTP.");
      }

      if (!payload.requestId) {
        setSuccess(
          "We could not start email recovery for that address. Please confirm the saved staff email or contact an administrator.",
        );
        return;
      }

      setRequestId(payload.requestId || "");
      setMaskedEmail(payload.maskedEmail || "");
      setOtpDigits(buildOtpArray());
      setStep(2);
      setSuccess(
        `If the staff account exists, a 6-digit OTP has been sent to ${payload.maskedEmail || "the saved email address"}.`,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset-otp", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          otp: otpValue,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        resetToken?: string;
      };

      if (!response.ok || !payload.resetToken) {
        throw new Error(payload.error || "Unable to verify OTP.");
      }

      setResetToken(payload.resetToken);
      setStep(3);
      setSuccess("OTP verified. Set your new password now.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset-otp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          resetToken,
          password: newPassword,
          confirmPassword,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to reset password.");
      }

      setSuccess("Password reset successful. Redirecting to the login page...");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.replace("/login?reset=success");
      }, 1200);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2>Reset Password</h2>

      <div className="steps">
        <div className={`step ${step >= 1 ? "active" : ""}`}>
          <span>1</span>
        </div>
        <div className={`line ${step >= 2 ? "active" : ""}`} />
        <div className={`step ${step >= 2 ? "active" : ""}`}>
          <span>2</span>
        </div>
        <div className={`line ${step >= 3 ? "active" : ""}`} />
        <div className={`step ${step >= 3 ? "active" : ""}`}>
          <span>3</span>
        </div>
      </div>

      {step === 1 && (
        <form className="form" onSubmit={handleSendOtp}>
          <p className="subtitle">Enter the personal email saved on the staff account to receive a reset OTP by email.</p>

          <div className="form-group">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="form" onSubmit={handleVerifyOtp}>
          <p className="subtitle">
            Enter the 6-digit OTP sent to {maskedEmail || "your saved email address"}.
          </p>

          <div className="form-group">
            <label>OTP Code</label>
            <div className="otp-input-group">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  className="otp-digit-input"
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="submit-btn" type="submit" disabled={isSubmitting || otpValue.length !== 6}>
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form className="form" onSubmit={handleResetPassword}>
          <p className="subtitle">Set a new password for your staff account.</p>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="password-wrapper">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label="Toggle new password visibility"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div className="password-wrapper">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <a href="/login" className="forgot">
        Back to Login
      </a>
    </>
  );
}
