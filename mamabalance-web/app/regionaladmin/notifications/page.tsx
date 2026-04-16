"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCheck, ChevronRight, X } from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";
import "@/app/regionaladmin/styles/notifications.css";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  ticketId: string | null;
  ticketNumber: string | null;
  issueCategory: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
  requesterName: string | null;
  requesterRole: string | null;
};

export default function RegionalAdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/regionaladmin/notifications", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load notifications.");
      }

      setNotifications(payload.notifications || []);
      setUnreadCount(payload.unreadCount || 0);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markOneAsRead(id: string) {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/regionaladmin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update notification.");
      }

      await loadNotifications();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update notification.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function dismissNotification(id: string) {
    const response = await fetch("/api/regionaladmin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismiss: true }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to dismiss notification.");
    }
  }

  async function handleDismissNotification(
    event: MouseEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.stopPropagation();

    try {
      setIsUpdating(true);
      await dismissNotification(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      setUnreadCount((current) => {
        const dismissed = notifications.find((item) => item.id === id);
        return dismissed && !dismissed.read ? Math.max(0, current - 1) : current;
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to dismiss notification.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleOpenNotification(item: NotificationItem) {
    try {
      if (!item.read) {
        await markOneAsRead(item.id);
      }

      router.push("/regionaladmin/help-support");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open notification.",
      );
    }
  }

  async function markAllAsRead() {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/regionaladmin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to mark all notifications as read.");
      }

      await loadNotifications();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const hasNotifications = notifications.length > 0;
  const hasUnread = unreadCount > 0;

  const groupedLabel = useMemo(() => {
    if (unreadCount === 0) return "All caught up";
    if (unreadCount === 1) return "1 unread notification";
    return `${unreadCount} unread notifications`;
  }, [unreadCount]);

  function formatDate(value: string | null) {
    if (!value) return "Just now";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Just now";

    return parsed.toLocaleString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="regional-notifications-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Notification Inbox</h1>
          <p>Review support-ticket alerts sent to your regional admin account.</p>
        </div>

        <div className="doctor-page-header-actions regional-notifications-actions">
          <div className="regional-notification-summary">
            <Bell size={18} />
            <span>{groupedLabel}</span>
          </div>
          <button
            className="btn-primary"
            onClick={() => void markAllAsRead()}
            disabled={!hasUnread || isUpdating}
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading inbox notifications..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : !hasNotifications ? (
        <div className="notifications-empty-card">
          <AlertTriangle size={28} />
          <h3>No notifications yet</h3>
          <p>When a user in your region submits a support ticket, it will appear here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className={`notification-card ${item.read ? "read" : "unread"}`}
              onClick={() => void handleOpenNotification(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleOpenNotification(item);
                }
              }}
            >
              <div className="notification-card-top">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                </div>
                <div className="notification-card-tools">
                  {!item.read ? <span className="notification-unread-dot" /> : null}
                  <span className={`notification-priority ${item.priority}`}>{item.priority}</span>
                  <button
                    type="button"
                    className="notification-dismiss-btn"
                    aria-label="Dismiss notification"
                    onClick={(event) => void handleDismissNotification(event, item.id)}
                    disabled={isUpdating}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="notification-meta">
                <span>{item.ticketNumber || "Support ticket"}</span>
                <span>Requester: {item.requesterName || "Unknown User"}</span>
                <span>Role: {item.requesterRole || "-"}</span>
                <span>Category: {item.issueCategory || "General"}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>

              <div className="notification-open-row">
                <span>Open Help & Support</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
