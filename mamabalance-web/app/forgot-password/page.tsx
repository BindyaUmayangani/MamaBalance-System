import Image from "next/image";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { redirectAuthenticatedUser } from "@/lib/auth/server";

import "../login/login.css";
import "./forgot-password.css";

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="logo-wrapper">
          <Image
            src="/images/logo.png"
            alt="MamaBalance Logo"
            width={100}
            height={100}
            priority
          />
        </div>

        <div className="left-content">
          <h1>Welcome to MamaBalance!</h1>

          <p>
            Staff password recovery now uses a secure OTP
            <br />
            sent by email before the password is changed.
          </p>

          <p>
            Enter the personal email saved on the staff account,
            <br />
            and the OTP will be delivered to that inbox.
          </p>

          <Image
            src="/images/login.png"
            alt="Mother illustration"
            width={280}
            height={280}
            className="illustration"
            priority
          />
        </div>

        <footer>© 2025 Bindya Umayangani. All Rights Reserved.</footer>
      </div>

      <div className="login-right">
        <div className="login-card">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
