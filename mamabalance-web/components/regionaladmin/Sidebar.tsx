"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  ClipboardList,
  Settings,
  CircleHelp,
} from "lucide-react";

import UserDropdown from "../common/UserDropdown";
import "../superadmin/Sidebar.css"; // reuse same CSS

export default function RegionalAdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname.startsWith(path) ? "active" : "";

  /* ===== USER DATA (later from auth/context) ===== */
  const user = {
    name: "Bindya Umayangani",
    role: "RegionalAdmin",
    region: "Kaduwela",
  };

  return (
    <aside className="sidebar">
      {/* ================= LOGO ================= */}
      <div className="sidebar-logo">
        <Image
          src="/images/logo.png"
          alt="MamaBalance"
          width={75}
          height={75}
        />
      </div>

      {/* ================= MENU ================= */}
      <nav className="sidebar-menu">

        <Link
          href="/regionaladmin/dashboard"
          className={isActive("/regionaladmin/dashboard")}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/regionaladmin/user-management/doctors"
          className={
            pathname.startsWith("/regionaladmin/user-management")
              ? "active"
              : ""
          }
        >
          <Users size={20} />
          User Management
        </Link>

        <Link
          href="/regionaladmin/educational-content"
          className={isActive("/regionaladmin/educational-content")}
        >
          <BookOpen size={20} />
          Educational Content
        </Link>

        <Link
          href="/regionaladmin/analytics"
          className={isActive("/regionaladmin/analytics")}
        >
          <BarChart3 size={20} />
          Regional Analytics
        </Link>

        <Link
          href="/regionaladmin/audit-logs"
          className={isActive("/regionaladmin/audit-logs")}
        >
          <ClipboardList size={20} />
          Audit Logs
        </Link>

        <Link
          href="/regionaladmin/settings"
          className={isActive("/regionaladmin/settings")}
        >
          <Settings size={20} />
          Settings
        </Link>

        <Link
          href="/regionaladmin/help-support"
          className={isActive("/regionaladmin/help-support")}
        >
          <CircleHelp size={20} />
          Help & Support
        </Link>
      </nav>

      {/* ================= USER DROPDOWN ================= */}
      <UserDropdown user={user} />
    </aside>
  );
}
