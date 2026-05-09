"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type Props = {
  href: string;
  apiPath: string;
  active: boolean;
  label?: string;
};

export default function SidebarNotificationLink({
  href,
  apiPath,
  active,
  label = "Notifications",
}: Props) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      try {
        const response = await fetch(apiPath, { cache: "no-store" });
        const payload = (await response.json()) as { unreadCount?: number };

        if (response.ok && isMounted) {
          setUnreadCount(payload.unreadCount || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [apiPath]);

  return (
    <Link
      href={href}
      className={`${active ? "active" : ""} sidebar-menu-with-badge`.trim()}
    >
      <Bell size={20} />
      <span className="sidebar-link-label">{label}</span>
      {unreadCount > 0 ? (
        <span
          className="sidebar-nav-badge"
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
