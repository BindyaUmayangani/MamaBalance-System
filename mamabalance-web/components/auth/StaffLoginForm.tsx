"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";

function getFriendlySignInError(caughtError: unknown) {
  if (!(caughtError instanceof Error)) {
    return "Sign-in failed. Please check your credentials and try again.";
  }

  const rawMessage = caughtError.message.toLowerCase();

  if (
    rawMessage.includes("auth/invalid-credential") ||
    rawMessage.includes("auth/invalid-email") ||
    rawMessage.includes("auth/user-not-found") ||
    rawMessage.includes("auth/wrong-password") ||
    rawMessage.includes("invalid credential")
  ) {
    return "Invalid email or password.";
  }

  if (rawMessage.includes("auth/too-many-requests")) {
    return "Too many failed attempts. Please try again later.";
  }

  if (rawMessage.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection and try again.";
  }

  return caughtError.message;
}

export default function StaffLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const resolveResponse = await fetch("/api/auth/resolve-login-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const resolvePayload = (await resolveResponse.json()) as {
        loginEmail?: string;
      };

      const resolvedEmail = resolveResponse.ok && resolvePayload.loginEmail
        ? resolvePayload.loginEmail
        : email.trim();

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        resolvedEmail,
        password,
      );

      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const payload = (await response.json()) as {
        redirectPath?: string;
        error?: string;
      };

      if (!response.ok || !payload.redirectPath) {
        await firebaseAuth.signOut();
        throw new Error(payload.error || "Unable to start your secure session.");
      }

      router.replace(payload.redirectPath);
      router.refresh();
    } catch (caughtError) {
      setError(getFriendlySignInError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2>Sign In</h2>
      <p className="subtitle">Staff access for superadmins, regional admins, doctors, and midwives.</p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>

          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error ? <p className="form-message error">{error}</p> : null}

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <a href="/forgot-password" className="forgot">
        Forgot Password?
      </a>
    </>
  );
}
