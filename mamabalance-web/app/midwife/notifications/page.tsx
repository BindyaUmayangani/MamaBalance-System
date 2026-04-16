"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCheck, ChevronRight, X } from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";
import "@/app/regionaladmin/styles/notifications.css";

type NotificationItem = {
  id: string;
  type: "assignment" | "high_risk" | "overdue_visit" | "doctor_observation";
  title: string;
  message: string;
  motherUid: string | null;
  motherName: string | null;
  score: number | null;
  riskLevel: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function openLabel(type: NotificationItem["type"]) {
  if (type === "overdue_visit") return "Open in Upcoming Visits";
  if (type === "doctor_observation") return "Open observations";
  if (type === "high_risk") return "Open high-risk record";
  return "Open in Assigned Mothers";
}

export default function MidwifeNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/midwife/notifications", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load notifications.");
      }

      setNotifications(payload.notifications || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  async function markAsRead(id: string) {
    const response = await fetch("/api/midwife/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Unable to mark notification as read.");
    }
  }

  async function handleOpenNotification(item: NotificationItem) {
    try {
      if (!item.read) {
        await markAsRead(item.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, read: true } : entry,
          ),
        );
      }

      if (item.type === "high_risk" && item.motherUid) {
        router.push(
          `/midwife/high-risk-mothers?highlight=${encodeURIComponent(item.motherUid)}`,
        );
        return;
      }

      if (item.type === "overdue_visit") {
        router.push("/midwife/upcoming-visits");
        return;
      }

      if (item.type === "doctor_observation") {
        router.push(
          `/midwife/observations-and-visits${item.motherUid ? `?search=${encodeURIComponent(item.motherName || item.motherUid)}` : ""}`,
        );
        return;
      }

      if (item.motherUid) {
        router.push(
          `/midwife/assigned-mothers?highlight=${encodeURIComponent(item.motherUid)}`,
        );
        return;
      }

      router.push("/midwife/assigned-mothers");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open notification.",
      );
    }
  }

  async function handleMarkAllRead() {
    try {
      const response = await fetch("/api/midwife/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Unable to mark all notifications as read.");
      }

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to mark notifications as read.",
      );
    }
  }

  async function dismissNotification(id: string) {
    const response = await fetch("/api/midwife/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, dismiss: true }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Unable to dismiss notification.");
    }
  }

  async function handleDismissNotification(
    event: MouseEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.stopPropagation();

    try {
      await dismissNotification(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to dismiss notification.",
      );
    }
  }

  const hasNotifications = notifications.length > 0;

  return (
    <div className="regional-notifications-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Notification Inbox</h1>
          <p>Review assignments, high-risk alerts, overdue visits, and doctor observations for your assigned mothers.</p>
        </div>
        <div className="doctor-page-header-actions regional-notifications-actions">
          <div className="regional-notification-summary">
            <Bell size={18} />
            <span>{unreadCount} unread</span>
          </div>
          <button
            className="btn-primary"
            onClick={() => void handleMarkAllRead()}
            disabled={!hasNotifications || unreadCount === 0}
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
          <p>Assignments, high-risk changes, overdue visits, and doctor observations will appear here.</p>
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
                  <button
                    type="button"
                    className="notification-dismiss-btn"
                    aria-label="Dismiss notification"
                    onClick={(event) => void handleDismissNotification(event, item.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="notification-meta">
                <span>{item.motherName || "Assigned mother"}</span>
                {item.score !== null ? <span>EPDS {item.score}</span> : null}
                <span className={`notification-priority ${item.priority}`}>{item.priority}</span>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>

              <div className="notification-open-row">
                <span>{openLabel(item.type)}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
