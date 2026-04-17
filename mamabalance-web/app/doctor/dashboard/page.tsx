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
import { getCurrentUserClient } from "@/lib/auth/client";
import type { MidwifeMotherRecord } from "@/lib/midwife/types";
import "@/app/midwife/styles/MidwifeDashboard.css";

type DoctorQueueFilter = "Today" | "Next 7 Days";

type DoctorVisitSummaryItem = {
  id: string;
  label: string;
  value: number;
  tone: "mint" | "red" | "green";
  icon: typeof Clock3;
};

type DoctorCheckupStatus = "Overdue" | "Completed" | "Upcoming";

type DoctorDashboardCheckup = {
  id: string;
  motherUid: string;
  motherName: string;
  riskLevel: "Low" | "Moderate" | "High";
  date: string;
  time: string;
  notes: string;
  status: DoctorCheckupStatus;
};

function parseDateValue(value: string | null | undefined) {
  if (!value || value === "-") {
    return null;
  }

  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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

function formatStatusLabel(status: MidwifeMotherRecord["lastStatus"]) {
  if (status === "overdue") return "Overdue";
  if (status === "completed") return "Completed";
  return "Upcoming";
}

function parseCheckupDate(checkup: DoctorDashboardCheckup) {
  return parseDateValue(`${checkup.date}T${checkup.time}`);
}

function formatCheckupDate(checkup: DoctorDashboardCheckup) {
  return formatVisitDate(`${checkup.date}T${checkup.time}`);
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Doctor");
  const [mothers, setMothers] = useState<MidwifeMotherRecord[]>([]);
  const [checkups, setCheckups] = useState<DoctorDashboardCheckup[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueFilter, setQueueFilter] = useState<DoctorQueueFilter>("Today");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");

        const [mothersResponse, checkupsResponse] = await Promise.all([
          fetch("/api/doctor/mothers", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/doctor/checkups", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const mothersPayload = (await mothersResponse.json()) as {
          mothers?: MidwifeMotherRecord[];
          error?: string;
        };
        const checkupsPayload = (await checkupsResponse.json()) as {
          checkups?: DoctorDashboardCheckup[];
          error?: string;
        };

        if (!mothersResponse.ok) {
          throw new Error(mothersPayload.error || "Unable to load doctor dashboard.");
        }

        if (!checkupsResponse.ok) {
          throw new Error(checkupsPayload.error || "Unable to load visit overview.");
        }

        if (isMounted) {
          setMothers(mothersPayload.mothers || []);
          setCheckups(checkupsPayload.checkups || []);
        }
      } catch (caughtError) {
        if (isMounted) {
          setMothers([]);
          setCheckups([]);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load doctor dashboard.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
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
        setDisplayName("Doctor");
      }
    }

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/doctor/notifications", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          unreadCount?: number;
        };

        if (response.ok && isMounted) {
          setUnreadNotifications(payload.unreadCount || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadNotifications(0);
        }
      }
    }

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfNextSevenDays = new Date(startOfToday);
    endOfNextSevenDays.setDate(startOfToday.getDate() + 7);
    endOfNextSevenDays.setHours(23, 59, 59, 999);

    const sortedCheckups = [...checkups].sort((first, second) => {
      const firstDate =
        parseCheckupDate(first)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const secondDate =
        parseCheckupDate(second)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    });

    const totalMothers = mothers.length;
    const highRiskCount = mothers.filter((mother) => mother.risk === "high").length;
    const moderateRiskCount = mothers.filter((mother) => mother.risk === "moderate").length;
    const lowRiskCount = mothers.filter((mother) => mother.risk === "low").length;
    const overdueCount = checkups.filter((checkup) => checkup.status === "Overdue").length;
    const completedCount = checkups.filter((checkup) => checkup.status === "Completed").length;
    const todayVisitCount = checkups.filter((checkup) => {
      const visitDate = parseCheckupDate(checkup);

      if (!visitDate) {
        return false;
      }

      return visitDate.toDateString() === now.toDateString();
    }).length;
    const urgentReviewCount = mothers.filter((mother) => {
      const epdsScore = Number(mother.lastEPDS || 0);
      return mother.lastStatus === "overdue" || epdsScore >= 16;
    }).length;

    const todayQueue = sortedCheckups.filter((checkup) => {
      const visitDate = parseCheckupDate(checkup);

      if (!visitDate) {
        return false;
      }

      if (checkup.status === "Completed") {
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
          parseDateValue(first.assignedAt || first.lastEPDSTestDate)?.getTime() ?? 0;
        const secondDate =
          parseDateValue(second.assignedAt || second.lastEPDSTestDate)?.getTime() ?? 0;
        return secondDate - firstDate;
      })
      .slice(0, 4);

    const priorityCases = [...mothers]
      .sort((first, second) => Number(second.lastEPDS || 0) - Number(first.lastEPDS || 0))
      .filter((mother) => mother.lastStatus === "overdue" || Number(mother.lastEPDS || 0) >= 16)
      .slice(0, 4);

    const visitSummary: DoctorVisitSummaryItem[] = [
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
      urgentReviewCount,
      visitSummary,
      careSummary,
      todayQueue,
      recentAssigned,
      priorityCases,
    };
  }, [checkups, mothers, queueFilter]);

  return (
    <div className="midwife-dashboard doctor-dashboard-page">
      <div className="doctor-page-header">
        <div className="role-header">
          <h1>Welcome, {displayName}</h1>
          <p>
            Track priority follow-ups, risk distribution, and the latest high-risk mothers under your care.
          </p>
        </div>

        <button
          type="button"
          className="midwife-notification"
          aria-label="Open notification inbox"
          onClick={() => router.push("/doctor/notifications")}
        >
          <Bell size={22} />
          {unreadNotifications > 0 ? (
            <span className="regional-notification-badge">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          ) : null}
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading doctor dashboard..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="midwife-top-grid">
            <div className="dashboard-card mothers-card">
              <h3>Mothers Under Your Care</h3>
              <p className="mothers-card-subtitle">
                Current case mix and review pressure across the high-risk mothers assigned to you.
              </p>

              <div className="care-modern-wrap">
                <div className="care-total-card">
                  <div>
                    <p>Total Mothers Assigned</p>
                    <h2>{dashboardData.totalMothers}</h2>
                    <span className="care-total-chip">
                      {dashboardData.urgentReviewCount} need closer review
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
                        {item.id === "high" ? <AlertTriangle size={14} /> : null}
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
                    Review today&apos;s clinical queue first, then move through the next seven days of follow-ups.
                  </p>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => router.push("/doctor/upcoming-checkup")}
                >
                  View All Checkups
                </button>
              </div>

              <div className="visit-summary-grid">
                {dashboardData.visitSummary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className={`visit-summary-card tone-${item.tone}`}>
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
                            setQueueFilter(event.target.value as DoctorQueueFilter)
                          }
                        >
                          <option value="Today">Today</option>
                          <option value="Next 7 Days">Next 7 Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="today-queue-list">
                    {dashboardData.todayQueue.length > 0 ? (
                      dashboardData.todayQueue.map((checkup) => (
                        <div key={checkup.id} className="visit-row">
                          <div>
                            <p className="visit-row-name">{checkup.motherName}</p>
                            <p className="visit-row-meta">
                              {checkup.riskLevel} risk - {checkup.notes}
                            </p>
                          </div>
                          <div className="visit-row-end">
                            <span className="visit-row-time">
                              {formatCheckupDate(checkup)}
                            </span>
                            <span className={`visit-pill ${checkup.status.toLowerCase()}`}>
                              {checkup.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-inline-state">
                        No active checkups are scheduled right now.
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
                  Quick access to the latest high-risk mothers added to your dashboard workload.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => router.push("/doctor/assigned-mothers")}
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
                          {mother.userId} - @{mother.username}
                        </p>
                      </div>
                      <span className={`risk-badge soft ${mother.risk}`}>
                        {mother.risk} risk
                      </span>
                    </div>

                    <div className="recent-mother-meta">
                      <div>
                        <span className="meta-label">Next Checkup</span>
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
                        EPDS {mother.lastEPDS || "-"} � {mother.assignedAt || "Recently assigned"}
                      </p>
                      <button
                        className="ghost-action-btn"
                        onClick={() =>
                          router.push(
                            `/doctor/assigned-mothers?highlight=${encodeURIComponent(mother.userId)}`,
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
                    New doctor assignments will appear here once a mother is linked to your care list.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="recent-mothers-card">
            <div className="table-header recent-mothers-header">
              <div>
                <p className="section-eyebrow">Urgent Follow-Up</p>
                <h3>Priority Review Cases</h3>
                <p className="recent-mothers-subtitle">
                  High-risk mothers with overdue follow-ups or elevated EPDS scores that may need immediate attention.
                </p>
              </div>
            </div>

            <div className="recent-mothers-grid">
              {dashboardData.priorityCases.length > 0 ? (
                dashboardData.priorityCases.map((mother) => (
                  <article key={mother.uid} className="recent-mother-item">
                    <div className="recent-mother-top">
                      <div>
                        <h4>{mother.name}</h4>
                        <p>{mother.region || "Assigned region"}</p>
                      </div>
                      <span className={`risk-badge soft ${mother.risk}`}>
                        {mother.risk} risk
                      </span>
                    </div>

                    <div className="recent-mother-meta">
                      <div>
                        <span className="meta-label">EPDS Score</span>
                        <strong>{mother.lastEPDS || "-"}</strong>
                      </div>
                      <div>
                        <span className="meta-label">Status</span>
                        <span className={`status ${mother.lastStatus}`}>
                          {mother.lastStatus}
                        </span>
                      </div>
                    </div>

                    <div className="recent-mother-footer">
                      <p>Next checkup {formatVisitDate(mother.upcomingCheckup)}</p>
                      <button
                        className="ghost-action-btn"
                        onClick={() =>
                          router.push(
                            `/doctor/assigned-mothers?highlight=${encodeURIComponent(mother.userId)}`,
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
                  <h4>No urgent review cases right now</h4>
                  <p>Overdue or elevated-score cases will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
