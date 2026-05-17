"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  Users,
  MapPin,
  BookOpen,
  Pill,
  BarChart3,
  ArrowRightLeft,
  ClipboardList,
  Settings,
  CircleHelp,
} from "lucide-react";

import SidebarNotificationLink from "../common/SidebarNotificationLink";
import "./Sidebar.css";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname.startsWith(path) ? "active" : "";

  return (
    <aside className="sidebar superadmin-sidebar">
      {/* ================= LOGO ================= */}
      <div className="sidebar-logo">
        <Image
          src="/images/new_logo.png"
          alt="MamaBalance"
          width={75}
          height={75}
        />
      </div>

      {/* ================= MENU ================= */}
      <nav className="sidebar-menu">
        <Link
          href="/superadmin/dashboard"
          className={isActive("/superadmin/dashboard")}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/superadmin/admin-management"
          className={isActive("/superadmin/admin-management")}
        >
          <Shield size={20} />
          Admin Management
        </Link>

        <Link
          href="/superadmin/user-management/doctors"
          className={
            pathname.startsWith("/superadmin/user-management")
              ? "active"
              : ""
          }
        >
          <Users size={20} />
          User Management
        </Link>

        <Link
          href="/superadmin/region-management"
          className={isActive("/superadmin/region-management")}
        >
          <MapPin size={20} />
          Region Management
        </Link>

        <Link
          href="/superadmin/educational-content"
          className={isActive("/superadmin/educational-content")}
        >
          <BookOpen size={20} />
          Educational Content
        </Link>

        <Link
          href="/superadmin/medicine-management"
          className={isActive("/superadmin/medicine-management")}
        >
          <Pill size={20} />
          Medicine Management
        </Link>

        <Link
          href="/superadmin/analytics-reports"
          className={isActive("/superadmin/analytics-reports")}
        >
          <BarChart3 size={20} />
          Analytics & Reports
        </Link>

        <Link
          href="/superadmin/referrals"
          className={isActive("/superadmin/referrals")}
        >
          <ArrowRightLeft size={20} />
          User Referrals
        </Link>

        <Link
          href="/superadmin/audit-logs"
          className={isActive("/superadmin/audit-logs")}
        >
          <ClipboardList size={20} />
          Audit Logs
        </Link>

        <SidebarNotificationLink
          href="/superadmin/notifications"
          apiPath="/api/superadmin/notifications"
          active={pathname.startsWith("/superadmin/notifications")}
        />

        <Link
          href="/superadmin/settings"
          className={isActive("/superadmin/settings")}
        >
          <Settings size={20} />
          Settings
        </Link>

        <Link
          href="/superadmin/help-support"
          className={isActive("/superadmin/help-support")}
        >
          <CircleHelp size={20} />
          Help & Support
        </Link>
      </nav>
    </aside>
  );
}
