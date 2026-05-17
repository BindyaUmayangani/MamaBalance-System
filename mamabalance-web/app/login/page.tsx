import Image from "next/image";
import StaffLoginForm from "@/components/auth/StaffLoginForm";
import { redirectAuthenticatedUser } from "@/lib/auth/server";
import "./login.css";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <div className="login-container">

      {/* LEFT SECTION */}
      <div className="login-left">

        {/* Logo */}
        <div className="logo-wrapper">
          <Image
            src="/images/new_logo.png"
            alt="MamaBalance Logo"
            width={100}
            height={100}
            priority
          />
        </div>

        {/* Main Content */}
        <div className="left-content">
          <h1>Welcome to MamaBalance!</h1>

          <p>
            Empowering healthcare teams to monitor,<br />
            support, and protect maternal mental health across Sri Lanka.
          </p>

          <p>
            Please log in to manage users, track EPDS assessments,<br />
            and ensure timely follow-up for mothers in need.
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

        <footer>
          © 2025 Bindya Umayangani. All Rights Reserved.
        </footer>
      </div>

      <div className="login-right">
        <div className="login-card">
          <StaffLoginForm />
        </div>
      </div>

    </div>
  );
}
