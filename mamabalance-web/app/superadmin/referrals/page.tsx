"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clock3,
  Search,
  X,
} from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/superadmin/styles/auditLogs.css";
import "@/app/superadmin/styles/referrals.css";

type ReferralType = "doctor" | "midwife" | "mother";
type ReferralStatus = "pending" | "accepted" | "rejected";
type FilterValue = "all";

type RegionOption = {
  id: string;
  name: string;
};

type ReferralRow = {
  id: string;
  type: ReferralType;
  status: ReferralStatus;
  userUid: string;
  userId: string;
  userName: string;
  sourceRegionId: string;
  sourceRegionName: string;
  targetRegionId: string;
  targetRegionName: string;
  reason: string;
  requestedByUid: string;
  requestedByName: string;
  decidedByUid: string | null;
  decidedByName: string | null;
  assignedMidwifeUid: string | null;
  assignedMidwifeName: string | null;
  guardianUid: string | null;
  guardianName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  decidedAt: string | null;
};

type ReferralsPayload = {
  referrals: ReferralRow[];
  regions: RegionOption[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
};

const EMPTY_PAYLOAD: ReferralsPayload = {
  referrals: [],
  regions: [],
  stats: {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  },
};

const TYPE_LABELS: Record<ReferralType, string> = {
  doctor: "Doctor",
  midwife: "Midwife",
  mother: "Mother / Guardian",
};

function formatDateTime(value: string | null) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusIcon(status: ReferralStatus) {
  if (status === "accepted") return <Check size={15} />;
  if (status === "rejected") return <X size={15} />;
  return <Clock3 size={15} />;
}

export default function SuperadminReferralsPage() {
  const [payload, setPayload] = useState<ReferralsPayload>(EMPTY_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | FilterValue>("all");
  const [typeFilter, setTypeFilter] = useState<ReferralType | FilterValue>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [expandedReferralId, setExpandedReferralId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReferrals() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/superadmin/referrals", {
          cache: "no-store",
        });
        const data = (await response.json()) as ReferralsPayload & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load user referrals.");
        }

        if (isMounted) {
          setPayload({
            ...EMPTY_PAYLOAD,
            ...data,
          });
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load user referrals.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReferrals();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReferrals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return payload.referrals
      .filter((referral) => statusFilter === "all" || referral.status === statusFilter)
      .filter((referral) => typeFilter === "all" || referral.type === typeFilter)
      .filter(
        (referral) =>
          regionFilter === "all" ||
          referral.sourceRegionId === regionFilter ||
          referral.targetRegionId === regionFilter,
      )
      .filter((referral) => {
        if (!normalizedSearch) return true;

        return [
          referral.id,
          referral.userUid,
          referral.userName,
          referral.userId,
          referral.type,
          TYPE_LABELS[referral.type],
          referral.status,
          referral.sourceRegionId,
          referral.sourceRegionName,
          referral.targetRegionId,
          referral.targetRegionName,
          referral.requestedByUid,
          referral.requestedByName,
          referral.decidedByUid,
          referral.decidedByName,
          referral.assignedMidwifeUid,
          referral.assignedMidwifeName,
          referral.guardianUid,
          referral.guardianName,
          referral.reason,
          referral.createdAt,
          referral.updatedAt,
          referral.decidedAt,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [payload.referrals, regionFilter, search, statusFilter, typeFilter]);

  return (
    <div className="audit-page superadmin-referrals-page">
      <div className="audit-header referrals-header">
        <div className="role-header">
          <h1>User Referrals History</h1>
          <p>View doctor, midwife, and mother transfer referrals across all regions.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading user referrals history..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="audit-filters referrals-toolbar">
            <div className="referrals-filter-group">
              <div className="audit-filter-select referrals-select-wrap">
                <select
                  value={statusFilter}
                  aria-label="Filter by status"
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ReferralStatus | FilterValue)
                  }
                >
                  <option value="all">Status: All</option>
                  <option value="pending">Status: Pending</option>
                  <option value="accepted">Status: Accepted</option>
                  <option value="rejected">Status: Rejected</option>
                </select>
                <ChevronDown size={18} className="audit-filter-icon" />
              </div>

              <div className="audit-filter-select referrals-select-wrap">
                <select
                  value={typeFilter}
                  aria-label="Filter by referral type"
                  onChange={(event) =>
                    setTypeFilter(event.target.value as ReferralType | FilterValue)
                  }
                >
                  <option value="all">User Type: All</option>
                  <option value="mother">Mother / Guardian</option>
                  <option value="midwife">Midwife</option>
                  <option value="doctor">Doctor</option>
                </select>
                <ChevronDown size={18} className="audit-filter-icon" />
              </div>

              <div className="audit-filter-select referrals-select-wrap">
                <select
                  value={regionFilter}
                  aria-label="Filter by region"
                  onChange={(event) => setRegionFilter(event.target.value)}
                >
                  <option value="all">Region: All</option>
                  {payload.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {`Region: ${region.name}`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="audit-filter-icon" />
              </div>
            </div>

            <div className="audit-search-box audit-search-wide referrals-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search user, region, reason..."
              />
            </div>
          </div>

          <div className="audit-cards referrals-stats-grid">
            <div className="audit-card referrals-stat-card">
              <span>Total Referrals</span>
              <strong>{payload.stats.total}</strong>
            </div>
            <div className="audit-card referrals-stat-card pending">
              <span>Pending</span>
              <strong>{payload.stats.pending}</strong>
            </div>
            <div className="audit-card referrals-stat-card accepted">
              <span>Accepted</span>
              <strong>{payload.stats.accepted}</strong>
            </div>
            <div className="audit-card referrals-stat-card rejected">
              <span>Rejected</span>
              <strong>{payload.stats.rejected}</strong>
            </div>
          </div>

          <section className="audit-table-card referrals-card">
            {filteredReferrals.length > 0 ? (
              <div className="referrals-table-wrap">
                <table className="audit-table referrals-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Referral Path</th>
                      <th>Status</th>
                      <th>Requested By</th>
                      <th>Requested</th>
                      <th>Decision</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((referral) => {
                        const isExpanded = expandedReferralId === referral.id;

                        return (
                          <Fragment key={referral.id}>
                            <tr>
                              <td>
                                <div className="referral-user-cell">
                                  <div>
                                    <strong>{referral.userName}</strong>
                                    <span>
                                      {TYPE_LABELS[referral.type]} -{" "}
                                      {referral.userId || referral.userUid}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="referral-path-cell">
                                  <span>{referral.sourceRegionName}</span>
                                  <ArrowRightLeft size={15} />
                                  <span>{referral.targetRegionName}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`referral-status ${referral.status}`}>
                                  {statusIcon(referral.status)}
                                  {referral.status}
                                </span>
                              </td>
                              <td>{referral.requestedByName}</td>
                              <td>{formatDateTime(referral.createdAt)}</td>
                              <td>
                                {referral.decidedByName
                                  ? `${referral.decidedByName} - ${formatDateTime(referral.decidedAt)}`
                                  : "Pending"}
                              </td>
                              <td className="referrals-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedReferralId(isExpanded ? "" : referral.id)
                                  }
                                >
                                  {isExpanded ? "Hide Details" : "View Details"}
                                </button>
                              </td>
                            </tr>
                            {isExpanded ? (
                              <tr className="referral-details-row">
                                <td colSpan={7}>
                                  <div className="referral-details-grid">
                                    <div>
                                      <span>Reason</span>
                                      <strong>{referral.reason || "-"}</strong>
                                    </div>
                                    <div>
                                      <span>Assigned Midwife</span>
                                      <strong>{referral.assignedMidwifeName || "-"}</strong>
                                    </div>
                                    <div>
                                      <span>Guardian</span>
                                      <strong>{referral.guardianName || "-"}</strong>
                                    </div>
                                    <div>
                                      <span>Last Updated</span>
                                      <strong>{formatDateTime(referral.updatedAt)}</strong>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="referrals-empty-card">
                <span className="referrals-empty-icon">
                  <Search size={24} />
                </span>
                <h3>No user referrals found</h3>
                <p>Try a different search term or filter to view matching referral history.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
