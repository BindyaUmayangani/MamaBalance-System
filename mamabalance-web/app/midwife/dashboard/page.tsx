"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CircleCheck,
  Clock3,
  Stethoscope,
} from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import { useMidwifeMothers } from "@/app/components/midwife/useMidwifeMothers";
import { getCurrentUserClient } from "@/lib/auth/client";
import "@/app/midwife/styles/MidwifeDashboard.css";

type VisitSummaryItem = {
  id: string;
  label: string;
  value: number;
  tone: "mint" | "red" | "green";
  icon: typeof Clock3;
};

type QueueFilter = "Today" | "Next 7 Days";
type QueueVisit = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: "Low" | "Moderate" | "High";
  visitType: "home" | "clinic";
  date: string;
  time: string;
  notes: string;
  status: "Overdue" | "Upcoming" | "Rescheduled" | "Completed";
};

type MidwifeNotificationItem = {
  id: string;
  type: "assignment" | "high_risk" | "overdue_visit" | "doctor_observation";
  title: string;
  message: string;
  motherUid: string | null;
  motherName: string | null;
  score: number | null;
  riskLevel: string | null;
  read: boolean;
  createdAt: string | null;
  attemptedAt: string | null;
};

function parseDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatVisitDate(value: string) {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatShare(count: number, total: number) {
  if (total === 0) {
    return "0% of caseload";
  }

  return `${Math.round((count / total) * 100)}% of caseload`;
}

function resolveQueueStatus(visit: QueueVisit) {
  if (visit.status === "Completed" || visit.status === "Rescheduled") {
    return visit.status;
  }

  const visitDate = parseDateValue(`${visit.date} ${visit.time}`);

  if (!visitDate) {
    return "Upcoming";
  }

  return visitDate.getTime() < Date.now() ? "Overdue" : "Upcoming";
}

export default function MidwifeDashboard() {
  const router = useRouter();
  const { mothers, isLoading, error } = useMidwifeMothers("assigned");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("Today");
  const [visitItems, setVisitItems] = useState<QueueVisit[]>([]);
  const [visitError, setVisitError] = useState("");
  const [displayName, setDisplayName] = useState("Midwife");
  const [notifications, setNotifications] = useState<MidwifeNotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    async function loadVisits() {
      try {
        const response = await fetch("/api/midwife/visits", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          visits?: QueueVisit[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load visits.");
        }

        setVisitItems(payload.visits || []);
        setVisitError("");
      } catch (caughtError) {
        setVisitItems([]);
        setVisitError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load visits.",
        );
      }
    }

    void loadVisits();
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const payload = (await getCurrentUserClient()) as {
          user?: {
            displayName?: string | null;
          } | null;
        };

        if (payload.user?.displayName) {
          setDisplayName(payload.user.displayName);
        }
      } catch {
        setDisplayName("Midwife");
      }
    }

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch("/api/midwife/notifications", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          notifications?: MidwifeNotificationItem[];
          unreadCount?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load notifications.");
        }

        setNotifications(payload.notifications || []);
        setUnreadNotificationCount(payload.unreadCount || 0);
        setNotificationError("");
      } catch (caughtError) {
        setNotifications([]);
        setUnreadNotificationCount(0);
        setNotificationError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load notifications.",
        );
      }
    }

    void loadNotifications();
  }, []);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfNextSevenDays = new Date(startOfToday);
    endOfNextSevenDays.setDate(startOfToday.getDate() + 7);
    endOfNextSevenDays.setHours(23, 59, 59, 999);

    const sortedVisits = [...visitItems].sort((first, second) => {
      const firstDate = parseDateValue(`${first.date} ${first.time}`)?.getTime()
        ?? Number.MAX_SAFE_INTEGER;
      const secondDate = parseDateValue(`${second.date} ${second.time}`)?.getTime()
        ?? Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    });

    const totalMothers = mothers.length;
    const highRiskCount = mothers.filter((mother) => mother.risk === "high").length;
    const moderateRiskCount = mothers.filter(
      (mother) => mother.risk === "moderate",
    ).length;
    const lowRiskCount = mothers.filter((mother) => mother.risk === "low").length;
    const overdueCount = visitItems.filter(
      (visit) => resolveQueueStatus(visit) === "Overdue",
    ).length;
    const completedCount = visitItems.filter(
      (visit) => visit.status === "Completed",
    ).length;
    const todayVisitCount = visitItems.filter((visit) => {
      const visitDate = parseDateValue(`${visit.date} ${visit.time}`);

      if (!visitDate) {
        return false;
      }

      return visitDate.toDateString() === now.toDateString();
    }).length;

    const doctorReviewCount = mothers.filter(
      (mother) =>
        mother.risk === "high" ||
        (mother.lastEPDS !== "" && Number(mother.lastEPDS) >= 16),
    ).length;

    const todayQueue = sortedVisits.filter((visit) => {
      const visitDate = parseDateValue(`${visit.date} ${visit.time}`);

      if (!visitDate) {
        return false;
      }

      if (visit.status === "Completed") {
        return false;
      }

      if (queueFilter === "Today") {
        return visitDate.toDateString() === startOfToday.toDateString();
      }

      return visitDate >= startOfToday && visitDate <= endOfNextSevenDays;
    });

    const recentAssigned = [...mothers]
      .sort((first, second) => {
        const firstDate =
          parseDateValue(first.assignedAt || first.upcomingCheckup)?.getTime() ?? 0;
        const secondDate =
          parseDateValue(second.assignedAt || second.upcomingCheckup)?.getTime() ?? 0;
        return secondDate - firstDate;
      })
      .slice(0, 4);

    const visitSummary: VisitSummaryItem[] = [
      {
        id: "today",
        label: "Today Visits",
        value: todayVisitCount,
        tone: "mint",
        icon: Clock3,
      },
      {
        id: "overdue",
        label: "Overdue Visits",
        value: overdueCount,
        tone: "red",
        icon: CalendarClock,
      },
      {
        id: "done",
        label: "Completed Follow-ups",
        value: completedCount,
        tone: "green",
        icon: CircleCheck,
      },
    ];

    const careSummary = [
      {
        id: "high",
        label: "High Risk",
        count: highRiskCount,
        tone: "high",
        share: formatShare(highRiskCount, totalMothers),
      },
      {
        id: "moderate",
        label: "Moderate Risk",
        count: moderateRiskCount,
        tone: "moderate",
        share: formatShare(moderateRiskCount, totalMothers),
      },
      {
        id: "low",
        label: "Low Risk",
        count: lowRiskCount,
        tone: "low",
        share: formatShare(lowRiskCount, totalMothers),
      },
    ] as const;

    return {
      totalMothers,
      doctorReviewCount,
      visitSummary,
      careSummary,
      todayQueue,
      recentAssigned,
    };
  }, [mothers, queueFilter, visitItems]);

  const highRiskNotifications = useMemo(() => {
    const seenMothers = new Set<string>();

    return notifications
      .filter((item) => item.type === "high_risk")
      .filter((item) => {
        const dedupeKey = item.motherUid || item.motherName || item.id;

        if (seenMothers.has(dedupeKey)) {
          return false;
        }

        seenMothers.add(dedupeKey);
        return true;
      })
      .slice(0, 4);
  }, [notifications]);

  return (
    <div className="midwife-dashboard doctor-dashboard-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Welcome, {displayName}</h1>
          <p>
            Track urgent follow-ups, risk distribution, and the latest mothers added to your care list.
          </p>
        </div>

        <button
          type="button"
          className="midwife-notification"
          aria-label="Notifications"
          onClick={() => router.push("/midwife/notifications")}
        >
          <Bell size={22} />
          {unreadNotificationCount > 0 ? (
            <span className="regional-notification-badge">
              {unreadNotificationCount}
            </span>
          ) : null}
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading midwife dashboard..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="midwife-top-grid">
            <div className="dashboard-card mothers-card">
              <h3>Mothers Under Your Care</h3>
              <p className="mothers-card-subtitle">
                Current case mix and follow-up pressure across your assigned
                mothers.
              </p>

              <div className="care-modern-wrap">
                <div className="care-total-card">
                  <div>
                    <p>Total Mothers Assigned</p>
                    <h2>{dashboardData.totalMothers}</h2>
                    <span className="care-total-chip">
                      {dashboardData.doctorReviewCount} need closer review
                    </span>
                  </div>
                  <span className="care-total-icon">
                    <Stethoscope size={22} />
                  </span>
                </div>

                <div className="care-risk-grid">
                  {dashboardData.careSummary.map((item) => (
                    <div key={item.id} className={`care-risk-card ${item.tone}`}>
                      <div className="care-risk-top">
                        <p>{item.label}</p>
                        {item.id === "high" && <AlertTriangle size={14} />}
                      </div>
                      <h4>{String(item.count).padStart(2, "0")}</h4>
                      <small>{item.share}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashboard-card checkup-card">
              <div className="checkup-header">
                <div>
                  <h3 className="checkup-title">Visits Overview</h3>
                  <p className="checkup-subtitle">
                    Focus first on overdue mothers, then move through the nearest
                    scheduled visits.
                  </p>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => router.push("/midwife/upcoming-visits")}
                >
                  View All Visits
                </button>
              </div>

              <div className="visit-summary-grid">
                {dashboardData.visitSummary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`visit-summary-card tone-${item.tone}`}
                    >
                      <div className="visit-summary-top">
                        <span>{item.label}</span>
                        <Icon size={16} />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="visit-panels">
                <div className="visit-panel">
                  <div className="visit-panel-header">
                    <h4>Priority Queue</h4>
                    <div className="visit-panel-actions">
                      <div className="queue-filter-select">
                        <select
                          value={queueFilter}
                          onChange={(event) =>
                            setQueueFilter(event.target.value as QueueFilter)
                          }
                        >
                          <option value="Today">Today</option>
                          <option value="Next 7 Days">Next 7 Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="today-queue-list">
                    {visitError ? (
                      <p className="empty-inline-state">{visitError}</p>
                    ) : dashboardData.todayQueue.length > 0 ? (
                      dashboardData.todayQueue.map((visit) => {
                        const displayStatus = resolveQueueStatus(visit);

                        return (
                        <div key={visit.id} className="visit-row">
                          <div>
                            <p className="visit-row-name">{visit.motherName}</p>
                            <p className="visit-row-meta">
                              {visit.visitType === "clinic" ? "Clinic Visit" : "Home Visit"}
                            </p>
                          </div>
                          <div className="visit-row-end">
                            <span className="visit-row-time">
                              {formatVisitDate(`${visit.date} ${visit.time}`)}
                            </span>
                            <span className={`visit-pill ${displayStatus.toLowerCase()}`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>
                      )})
                    ) : (
                      <p className="empty-inline-state">
                        No active visits are scheduled right now.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="recent-mothers-card">
            <div className="table-header recent-mothers-header">
              <div>
                <p className="section-eyebrow">Assigned Mothers Snapshot</p>
                <h3>Recent Assigned Mothers</h3>
                <p className="recent-mothers-subtitle">
                  Quick access to the latest mothers added to your dashboard
                  workload.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => router.push("/midwife/assigned-mothers")}
              >
                View All Assigned Mothers
              </button>
            </div>

            <div className="recent-mothers-grid">
              {dashboardData.recentAssigned.length > 0 ? (
                dashboardData.recentAssigned.map((mother) => (
                  <article key={mother.uid} className="recent-mother-item">
                    <div className="recent-mother-top">
                      <div>
                        <h4>{mother.name}</h4>
                        <p>
                          {mother.userId} · @{mother.username}
                        </p>
                      </div>
                      <span className={`risk-badge soft ${mother.risk}`}>
                        {mother.risk} risk
                      </span>
                    </div>

                    <div className="recent-mother-meta">
                      <div>
                        <span className="meta-label">Next Visit</span>
                        <strong>{formatVisitDate(mother.upcomingCheckup)}</strong>
                      </div>
                      <div>
                        <span className="meta-label">Status</span>
                        <span className={`status ${mother.lastStatus}`}>
                          {mother.lastStatus}
                        </span>
                      </div>
                    </div>

                    <div className="recent-mother-footer">
                      <p>
                        EPDS {mother.lastEPDS || "-"} · {" "}
                        {mother.assignedDoctor || "Doctor not assigned"}
                      </p>
                      <button
                        className="ghost-action-btn"
                        onClick={() =>
                          router.push(
                            `/midwife/assigned-mothers?highlight=${encodeURIComponent(
                              mother.userId,
                            )}`,
                          )
                        }
                      >
                        Open details
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="recent-mothers-empty">
                  <h4>No assigned mothers yet</h4>
                  <p>
                    New assignments will appear here once they are linked to
                    your care list.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="recent-mothers-card">
            <div className="table-header recent-mothers-header">
              <div>
                <p className="section-eyebrow">Urgent Alerts</p>
                <h3>High-Risk Notifications</h3>
                <p className="recent-mothers-subtitle">
                  New EPDS submissions that may need early follow-up.
                </p>
              </div>
            </div>

            <div className="recent-mothers-grid">
              {notificationError ? (
                <div className="recent-mothers-empty">
                  <h4>Notifications unavailable</h4>
                  <p>{notificationError}</p>
                </div>
              ) : highRiskNotifications.length > 0 ? (
                highRiskNotifications.map((item) => (
                  <article key={item.id} className="recent-mother-item">
                    <div className="recent-mother-top">
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.motherName || "Assigned mother"}</p>
                      </div>
                      <span className={`risk-badge soft ${(item.riskLevel || "high").toLowerCase()}`}>
                        {(item.riskLevel || "high")} risk
                      </span>
                    </div>

                    <div className="recent-mother-meta">
                      <div>
                        <span className="meta-label">EPDS Score</span>
                        <strong>{item.score ?? "-"}</strong>
                      </div>
                      <div>
                        <span className="meta-label">Status</span>
                        <span className={`status ${item.read ? "completed" : "overdue"}`}>
                          {item.read ? "read" : "new"}
                        </span>
                      </div>
                    </div>

                    <div className="recent-mother-footer">
                      <p>{item.message}</p>
                      <button
                        className="ghost-action-btn"
                        onClick={() =>
                          router.push(
                            `/midwife/high-risk-mothers${item.motherUid ? `?highlight=${encodeURIComponent(item.motherUid)}` : ""}`,
                          )
                        }
                      >
                        Open case
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="recent-mothers-empty">
                  <h4>No urgent alerts right now</h4>
                  <p>New high-risk EPDS submissions will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

