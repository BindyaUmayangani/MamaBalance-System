"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  CircleHelp,
  MessageCircle,
} from "lucide-react";

import UserDropdown from "../common/UserDropdown";
import "../doctor/DoctorSidebar.css";
import "../superadmin/Sidebar.css";
import "./MidwifeSidebar.css";

export default function MidwifeSidebar() {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadMessages() {
      try {
        const response = await fetch("/api/midwife/messaging?summary=unread", {
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

  const user = {
    name: "Nadeesha Silva",
    role: "Midwife",
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Image
          src="/images/logo.png"
          alt="MamaBalance"
          width={75}
          height={75}
        />
      </div>

      <nav className="sidebar-menu">
        <Link
          href="/midwife/dashboard"
          className={pathname.startsWith("/midwife/dashboard") ? "active" : ""}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/midwife/assigned-mothers"
          className={pathname.startsWith("/midwife/assigned-mothers") ? "active" : ""}
        >
          <Users size={20} />
          Assigned Mothers
        </Link>

        <Link
          href="/midwife/high-risk-mothers"
          className={pathname.startsWith("/midwife/high-risk-mothers") ? "active" : ""}
        >
          <AlertTriangle size={20} />
          High Risk Mothers
        </Link>

        <Link
          href="/midwife/observations-and-visits"
          className={pathname.startsWith("/midwife/observations-and-visits") ? "active" : ""}
        >
          <Activity size={20} />
          Observations and Visits
        </Link>

        <Link
          href="/midwife/upcoming-visits"
          className={pathname.startsWith("/midwife/upcoming-visits") ? "active" : ""}
        >
          <CalendarDays size={20} />
          Upcoming Visits
        </Link>

        <Link
          href="/midwife/analytics"
          className={pathname.startsWith("/midwife/analytics") ? "active" : ""}
        >
          <BarChart3 size={20} />
          Analytics
        </Link>

        <Link
          href="/midwife/messaging"
          className={`${pathname.startsWith("/midwife/messaging") ? "active" : ""} sidebar-menu-with-badge`.trim()}
        >
          <MessageCircle size={20} />
          <span className="sidebar-link-label">Messaging</span>
          {unreadMessages > 0 ? (
            <span className="sidebar-message-badge" aria-label={`${unreadMessages} unread messages`}>
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          ) : null}
        </Link>

        <Link
          href="/midwife/settings"
          className={pathname.startsWith("/midwife/settings") ? "active" : ""}
        >
          <Settings size={20} />
          Settings
        </Link>

        <Link
          href="/midwife/help-support"
          className={pathname.startsWith("/midwife/help-support") ? "active" : ""}
        >
          <CircleHelp size={20} />
          Help & Support
        </Link>
      </nav>

      <UserDropdown user={user} />
    </aside>
  );
}
