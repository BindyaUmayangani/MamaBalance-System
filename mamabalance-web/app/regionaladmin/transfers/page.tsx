"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clock3,
  Search,
  Send,
  UserRoundCheck,
  X,
} from "lucide-react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/regionaladmin/styles/transfers.css";

type TransferType = "doctor" | "midwife" | "mother";
type TransferStatus = "pending" | "accepted" | "rejected";

type RegionOption = {
  id: string;
  name: string;
};

type TransferableUser = {
  uid: string;
  type: TransferType;
  userId: string;
  name: string;
  contact: string;
  assignedMidwifeUid: string | null;
  guardianName: string | null;
};

type MidwifeOption = {
  uid: string;
  userId: string;
  name: string;
};

type TransferRow = {
  id: string;
  type: TransferType;
  status: TransferStatus;
  userUid: string;
  userId: string;
  userName: string;
  sourceRegionId: string;
  sourceRegionName: string;
  targetRegionId: string;
  targetRegionName: string;
  reason: string;
  requestedByName: string;
  decidedByName: string | null;
  assignedMidwifeUid: string | null;
  assignedMidwifeName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  decidedAt: string | null;
};

type TransfersPayload = {
  actorRegionId: string;
  actorRegionName: string;
  regions: RegionOption[];
  users: TransferableUser[];
  targetMidwives: MidwifeOption[];
  incoming: TransferRow[];
  outgoing: TransferRow[];
};

type HistoryDirectionFilter = "all" | "incoming" | "outgoing";
type HistoryStatusFilter = "all" | TransferStatus;

const EMPTY_PAYLOAD: TransfersPayload = {
  actorRegionId: "",
  actorRegionName: "Assigned region",
  regions: [],
  users: [],
  targetMidwives: [],
  incoming: [],
  outgoing: [],
};

const TYPE_LABELS: Record<TransferType, string> = {
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

function statusIcon(status: TransferStatus) {
  if (status === "accepted") return <Check size={15} />;
  if (status === "rejected") return <X size={15} />;
  return <Clock3 size={15} />;
}

export default function RegionalTransfersPage() {
  const [payload, setPayload] = useState<TransfersPayload>(EMPTY_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [transferType, setTransferType] = useState<TransferType>("mother");
  const [userUid, setUserUid] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [targetRegionId, setTargetRegionId] = useState("");
  const [reason, setReason] = useState("");
  const [assignedMidwives, setAssignedMidwives] = useState<Record<string, string>>({});
  const [updatingTransferId, setUpdatingTransferId] = useState("");
  const [historyDirection, setHistoryDirection] = useState<HistoryDirectionFilter>("all");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>("all");
  const [historySearch, setHistorySearch] = useState("");

  async function loadTransfers() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/regionaladmin/transfers", {
        cache: "no-store",
      });
      const data = (await response.json()) as TransfersPayload & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load regional transfers.");
      }

      setPayload({
        ...EMPTY_PAYLOAD,
        ...data,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load regional transfers.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTransfers();
  }, []);

  useEffect(() => {
    if (!error && !success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [error, success]);

  const selectableUsers = useMemo(
    () => payload.users.filter((user) => user.type === transferType),
    [payload.users, transferType],
  );
  const filteredSelectableUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    if (!query) {
      return selectableUsers;
    }

    return selectableUsers.filter((user) =>
      [
        user.name,
        user.userId,
        user.contact,
        user.guardianName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [selectableUsers, userQuery]);

  const pendingIncoming = payload.incoming.filter((transfer) => transfer.status === "pending");
  const pendingOutgoing = payload.outgoing.filter((transfer) => transfer.status === "pending");
  const transferHistory = useMemo(() => {
    const rows = [
      ...payload.incoming.map((transfer) => ({
        ...transfer,
        direction: "incoming" as const,
      })),
      ...payload.outgoing.map((transfer) => ({
        ...transfer,
        direction: "outgoing" as const,
      })),
    ];
    const query = historySearch.trim().toLowerCase();

    return rows
      .filter((transfer) => historyDirection === "all" || transfer.direction === historyDirection)
      .filter((transfer) => historyStatus === "all" || transfer.status === historyStatus)
      .filter((transfer) => {
        if (!query) return true;

        return [
          transfer.id,
          transfer.userUid,
          transfer.userName,
          transfer.userId,
          transfer.type,
          TYPE_LABELS[transfer.type],
          transfer.status,
          transfer.sourceRegionId,
          transfer.sourceRegionName,
          transfer.targetRegionId,
          transfer.targetRegionName,
          transfer.requestedByName,
          transfer.decidedByName,
          transfer.assignedMidwifeUid,
          transfer.assignedMidwifeName,
          transfer.reason,
          transfer.createdAt,
          transfer.updatedAt,
          transfer.decidedAt,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [
    payload.incoming,
    payload.outgoing,
    historyDirection,
    historySearch,
    historyStatus,
  ]);

  function userOptionLabel(user: TransferableUser) {
    return `${user.name} (${user.userId})`;
  }

  function handleUserSearch(value: string) {
    setUserQuery(value);

    const exactMatch = selectableUsers.find(
      (user) => userOptionLabel(user).toLowerCase() === value.trim().toLowerCase(),
    );

    setUserUid(exactMatch?.uid || "");
  }

  function resolveTransferUser() {
    const query = userQuery.trim().toLowerCase();

    if (userUid) {
      const selectedUser = selectableUsers.find((user) => user.uid === userUid);

      if (selectedUser && userOptionLabel(selectedUser).toLowerCase() === query) {
        return selectedUser;
      }
    }

    const exactMatch = selectableUsers.find(
      (user) =>
        userOptionLabel(user).toLowerCase() === query ||
        user.userId.toLowerCase() === query ||
        user.name.toLowerCase() === query,
    );

    if (exactMatch) {
      return exactMatch;
    }

    if (query && filteredSelectableUsers.length === 1) {
      return filteredSelectableUsers[0];
    }

    return null;
  }

  function selectTransferUser(user: TransferableUser) {
    setUserUid(user.uid);
    setUserQuery(userOptionLabel(user));
    setIsUserMenuOpen(false);
  }

  async function requestTransfer() {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const selectedUser = resolveTransferUser();

      if (!selectedUser) {
        throw new Error(`Search and select a ${TYPE_LABELS[transferType].toLowerCase()} first.`);
      }

      const response = await fetch("/api/regionaladmin/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: transferType,
          userUid: selectedUser.uid,
          targetRegionId,
          reason,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to request transfer.");
      }

      setUserUid("");
      setUserQuery("");
      setTargetRegionId("");
      setReason("");
      setSuccess("Transfer referral sent to the receiving regional admin.");
      await loadTransfers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request transfer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function decideTransfer(id: string, action: "accept" | "reject") {
    setUpdatingTransferId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/regionaladmin/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          assignedMidwifeUid: assignedMidwives[id] || "",
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to update transfer.");
      }

      setAssignedMidwives((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setSuccess(action === "accept" ? "Transfer accepted." : "Transfer rejected.");
      await loadTransfers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update transfer.",
      );
    } finally {
      setUpdatingTransferId("");
    }
  }

  function renderTransferCard(transfer: TransferRow, direction: "incoming" | "outgoing") {
    const isPending = transfer.status === "pending";
    const isMother = transfer.type === "mother";
    const isUpdating = updatingTransferId === transfer.id;

    return (
      <article key={transfer.id} className="transfer-card">
        <div className="transfer-card-top">
          <div>
            <div className="transfer-card-eyebrow">
              <ArrowRightLeft size={14} />
              {TYPE_LABELS[transfer.type]}
            </div>
            <h3>{transfer.userName}</h3>
            <p>
              {transfer.sourceRegionName} to {transfer.targetRegionName}
            </p>
          </div>
          <span className={`transfer-status ${transfer.status}`}>
            {statusIcon(transfer.status)}
            {transfer.status}
          </span>
        </div>

        <div className="transfer-meta-grid">
          <span>User ID: {transfer.userId || transfer.userUid}</span>
          <span>Requested by: {transfer.requestedByName}</span>
          <span>Requested: {formatDateTime(transfer.createdAt)}</span>
          <span>
            Decision:{" "}
            {transfer.decidedByName
              ? `${transfer.decidedByName} on ${formatDateTime(transfer.decidedAt)}`
              : "Pending"}
          </span>
        </div>

        <p className="transfer-reason">{transfer.reason}</p>

        {transfer.assignedMidwifeName ? (
          <div className="transfer-assignment-chip">
            <UserRoundCheck size={15} />
            Assigned midwife: {transfer.assignedMidwifeName}
          </div>
        ) : null}

        {direction === "incoming" && isPending ? (
          <div className="transfer-decision-row">
            {isMother ? (
              <label className="transfer-midwife-select">
                <span>Target-region midwife</span>
                <div className="transfer-select-wrap">
                  <select
                    value={assignedMidwives[transfer.id] || ""}
                    onChange={(event) =>
                      setAssignedMidwives((current) => ({
                        ...current,
                        [transfer.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select midwife</option>
                    {payload.targetMidwives.map((midwife) => (
                      <option key={midwife.uid} value={midwife.uid}>
                        {midwife.name} ({midwife.userId})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="transfer-select-icon" />
                </div>
              </label>
            ) : null}

            <div className="transfer-decision-actions">
              <button
                type="button"
                className="btn-outline transfer-reject-btn"
                disabled={isUpdating}
                onClick={() => void decideTransfer(transfer.id, "reject")}
              >
                <X size={16} />
                Reject
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isUpdating || (isMother && !assignedMidwives[transfer.id])}
                onClick={() => void decideTransfer(transfer.id, "accept")}
              >
                <Check size={16} />
                Accept
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="role-page regional-transfer-page">
      <div className="page-header transfer-page-header">
        <div className="role-header">
          <h1>Regional Transfers</h1>
          <p>
            Refer doctors, midwives, or mother and guardian records to another region, then process incoming approvals for {payload.actorRegionName}.
          </p>
        </div>

        <div className="transfer-summary-strip">
          <span>{pendingIncoming.length} incoming pending</span>
          <span>{pendingOutgoing.length} outgoing pending</span>
        </div>
      </div>

      {error ? (
        <div className="transfer-alert error">
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="transfer-alert success">
          <Check size={18} />
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading regional transfers..." />
      ) : (
        <>
          <section className="transfer-request-panel">
            <div className="transfer-section-header">
              <div>
                <h2>Create Transfer Referral</h2>
                <p>Requests stay pending until the receiving regional admin reviews them.</p>
              </div>
            </div>

            <div className="transfer-form-grid">
              <label>
                <span>Transfer type</span>
                <div className="transfer-select-wrap">
                  <select
                    value={transferType}
                    onChange={(event) => {
                      setTransferType(event.target.value as TransferType);
                      setUserUid("");
                      setUserQuery("");
                    }}
                  >
                    <option value="mother">Mother / Guardian</option>
                    <option value="midwife">Midwife</option>
                    <option value="doctor">Doctor</option>
                  </select>
                  <ChevronDown size={18} className="transfer-select-icon" />
                </div>
              </label>

              <label>
                <span>User</span>
                <div
                  className="transfer-user-combobox"
                  onBlur={() => {
                    window.setTimeout(() => setIsUserMenuOpen(false), 120);
                  }}
                >
                  <Search size={18} className="transfer-user-search-icon" />
                  <input
                    value={userQuery}
                    onChange={(event) => handleUserSearch(event.target.value)}
                    onFocus={() => setIsUserMenuOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && filteredSelectableUsers[0]) {
                        event.preventDefault();
                        selectTransferUser(filteredSelectableUsers[0]);
                      }
                    }}
                    placeholder={`Search and select ${TYPE_LABELS[transferType]}`}
                  />
                  <ChevronDown size={18} className="transfer-select-icon" />

                  {isUserMenuOpen ? (
                    <div className="transfer-user-menu">
                      {filteredSelectableUsers.length > 0 ? (
                        filteredSelectableUsers.slice(0, 8).map((user) => (
                          <button
                            type="button"
                            key={user.uid}
                            className={user.uid === userUid ? "is-selected" : ""}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectTransferUser(user)}
                          >
                            <strong>{user.name}</strong>
                            <span>
                              {user.userId}
                              {user.guardianName ? ` - Guardian: ${user.guardianName}` : ""}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="transfer-user-menu-empty">
                          No matching {TYPE_LABELS[transferType].toLowerCase()} found
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </label>

              <label>
                <span>Target region</span>
                <div className="transfer-select-wrap">
                  <select
                    value={targetRegionId}
                    onChange={(event) => setTargetRegionId(event.target.value)}
                  >
                    <option value="">Select region</option>
                    {payload.regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="transfer-select-icon" />
                </div>
              </label>

              <label className="transfer-reason-field">
                <span>Reason</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason for regional transfer"
                  rows={3}
                />
              </label>
            </div>

            <div className="transfer-form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={() => void requestTransfer()}
              >
                <Send size={16} />
                {isSubmitting ? "Sending..." : "Send Referral"}
              </button>
            </div>
          </section>

          <div className="transfer-columns">
            <section className="transfer-list-section">
              <div className="transfer-section-header">
                <div>
                  <h2>Incoming Requests</h2>
                  <p>Accept mother transfers only after assigning a midwife in your region.</p>
                </div>
              </div>

              {pendingIncoming.length > 0 ? (
                <div className="transfer-list">
                  {pendingIncoming.map((transfer) => renderTransferCard(transfer, "incoming"))}
                </div>
              ) : (
                <div className="transfer-empty-card">
                  <span className="transfer-empty-icon">
                    <Clock3 size={24} />
                  </span>
                  <h3>No pending incoming transfers</h3>
                  <p>Accepted and rejected referrals are kept in Transfer History.</p>
                </div>
              )}
            </section>

            <section className="transfer-list-section">
              <div className="transfer-section-header">
                <div>
                  <h2>Outgoing Requests</h2>
                  <p>Track referrals your region has sent for another region to approve.</p>
                </div>
              </div>

              {pendingOutgoing.length > 0 ? (
                <div className="transfer-list">
                  {pendingOutgoing.map((transfer) => renderTransferCard(transfer, "outgoing"))}
                </div>
              ) : (
                <div className="transfer-empty-card">
                  <span className="transfer-empty-icon">
                    <ArrowRightLeft size={24} />
                  </span>
                  <h3>No pending outgoing transfers</h3>
                  <p>Sent referrals appear here until the receiving region decides.</p>
                </div>
              )}
            </section>
          </div>

          <section className="transfer-history-section">
            <div className="transfer-section-header transfer-history-header">
              <div>
                <h2>Transfer History</h2>
                <p>View every incoming and outgoing referral for your regional admin workspace.</p>
              </div>

              <div className="transfer-history-controls">
                <div className="transfer-history-toolbar">
                  <div className="transfer-history-search">
                    <Search size={17} />
                    <input
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder="Search history"
                    />
                  </div>

                  <div className="transfer-history-filter-group">
                    <div className="transfer-select-wrap transfer-history-select">
                      <select
                        value={historyDirection}
                        aria-label="Filter transfer direction"
                        onChange={(event) =>
                          setHistoryDirection(event.target.value as HistoryDirectionFilter)
                        }
                      >
                        <option value="all">All referrals</option>
                        <option value="incoming">Incoming</option>
                        <option value="outgoing">Outgoing</option>
                      </select>
                      <ChevronDown size={18} className="transfer-select-icon" />
                    </div>

                    <div className="transfer-select-wrap transfer-history-select">
                      <select
                        value={historyStatus}
                        aria-label="Filter transfer status"
                        onChange={(event) =>
                          setHistoryStatus(event.target.value as HistoryStatusFilter)
                        }
                      >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <ChevronDown size={18} className="transfer-select-icon" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {transferHistory.length > 0 ? (
              <div className="transfer-history-table-wrap">
                <table className="transfer-history-table">
                  <thead>
                    <tr>
                      <th>Referral</th>
                      <th>Direction</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Requested</th>
                      <th>Decision</th>
                      <th>Midwife</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferHistory.map((transfer) => (
                      <tr key={`${transfer.direction}-${transfer.id}`}>
                        <td>
                          <strong>{transfer.userName}</strong>
                          <span>
                            {TYPE_LABELS[transfer.type]} - {transfer.userId || transfer.userUid}
                          </span>
                        </td>
                        <td>
                          <span className={`transfer-direction ${transfer.direction}`}>
                            {transfer.direction}
                          </span>
                        </td>
                        <td>{transfer.sourceRegionName}</td>
                        <td>{transfer.targetRegionName}</td>
                        <td>
                          <span className={`transfer-status ${transfer.status}`}>
                            {statusIcon(transfer.status)}
                            {transfer.status}
                          </span>
                        </td>
                        <td>{formatDateTime(transfer.createdAt)}</td>
                        <td>
                          {transfer.decidedByName
                            ? `${transfer.decidedByName} - ${formatDateTime(transfer.decidedAt)}`
                            : "Pending"}
                        </td>
                        <td>{transfer.assignedMidwifeName || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="transfer-empty-card">
                <span className="transfer-empty-icon">
                  <Search size={24} />
                </span>
                <h3>No transfer history found</h3>
                <p>Try a different search term or filter.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
