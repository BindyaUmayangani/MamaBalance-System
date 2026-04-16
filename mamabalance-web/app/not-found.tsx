"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./not-found.css";

export default function NotFoundPage() {
  const pathname = usePathname();

  const getDashboardHref = () => {
    if (pathname.startsWith("/superadmin")) return "/superadmin/dashboard";
    if (pathname.startsWith("/regionaladmin")) return "/regionaladmin/dashboard";
    if (pathname.startsWith("/doctor")) return "/doctor/dashboard";
    if (pathname.startsWith("/midwife")) return "/midwife/dashboard";
    return "/";
  };

  return (
    <main className="notfound-page">
      <div className="notfound-card">
        <p className="notfound-code">404</p>
        <h1 className="notfound-title">Page not found</h1>
        <p className="notfound-text">
          Something went wrong or this page does not exist anymore.
        </p>

        <div className="notfound-actions">
          <Link href={getDashboardHref()} className="notfound-btn primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
