"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Pill,
  CalendarDays,
  BarChart3,
  MessageCircle,
  Settings,
  CircleHelp,
} from "lucide-react";

import SidebarNotificationLink from "../common/SidebarNotificationLink";
import "./DoctorSidebar.css";
import "../superadmin/Sidebar.css";

export default function DoctorSidebar() {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isActive = (path: string) =>
    pathname.startsWith(path) ? "active" : "";

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadMessages() {
      try {
        const response = await fetch("/api/doctor/messaging?summary=unread", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { unreadCount?: number };

        if (isMounted && response.ok) {
          setUnreadMessages(payload.unreadCount || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadMessages(0);
        }
      }
    }

    loadUnreadMessages();
    const interval = window.setInterval(loadUnreadMessages, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <aside className="sidebar">
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
          href="/doctor/dashboard"
          className={isActive("/doctor/dashboard")}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/doctor/assigned-mothers"
          className={isActive("/doctor/assigned-mothers")}
        >
          <Users size={20} />
          Assigned Mothers
        </Link>

        <Link
          href="/doctor/medical-observation"
          className={isActive("/doctor/medical-observation")}
        >
          <Stethoscope size={20} />
          Medical Observation
        </Link>

        <Link
          href="/doctor/medication-management"
          className={isActive("/doctor/medication-management")}
        >
          <Pill size={20} />
          Medication Management
        </Link>

        <Link
          href="/doctor/upcoming-checkup"
          className={isActive("/doctor/upcoming-checkup")}
        >
          <CalendarDays size={20} />
          Upcoming Checkup
        </Link>

        <Link
          href="/doctor/analytics"
          className={isActive("/doctor/analytics")}
        >
          <BarChart3 size={20} />
          Analytics
        </Link>

        <Link
          href="/doctor/messaging"
          className={`${isActive("/doctor/messaging")} sidebar-menu-with-badge`.trim()}
        >
          <MessageCircle size={20} />
          <span className="sidebar-link-label">Messaging</span>
          {unreadMessages > 0 ? (
            <span className="sidebar-message-badge" aria-label={`${unreadMessages} unread messages`}>
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          ) : null}
        </Link>

        <SidebarNotificationLink
          href="/doctor/notifications"
          apiPath="/api/doctor/notifications"
          active={pathname.startsWith("/doctor/notifications")}
        />

        <Link
          href="/doctor/settings"
          className={isActive("/doctor/settings")}
        >
          <Settings size={20} />
          Settings
        </Link>

        <Link
          href="/doctor/help-support"
          className={isActive("/doctor/help-support")}
        >
          <CircleHelp size={20} />
          Help & Support
        </Link>
      </nav>
    </aside>
  );
}
