"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type SupportOption = {
  value: string;
  label: string;
};

type TicketPriority = "low" | "medium" | "high";
type TicketStatus = "draft" | "submitted";

type CustomerSupportSectionProps = {
  intro: string;
  categoryOptions: SupportOption[];
  defaultCategory: string;
  defaultPriority?: TicketPriority;
};

type TicketListItem = {
  id: string;
  ticketNumber: string;
  issueCategory: string;
  priority: TicketPriority;
  status: TicketStatus;
  message: string;
  updatedAt: string | null;
};

const priorityOptions: SupportOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function CustomerSupportSection({
  intro,
  categoryOptions,
  defaultCategory,
  defaultPriority = "medium",
}: CustomerSupportSectionProps) {
  const [issueCategory, setIssueCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState<TicketPriority>(defaultPriority);
  const [contactMethod, setContactMethod] = useState("email");
  const [bestContactTime, setBestContactTime] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void loadTickets();
  }, []);

  async function loadTickets() {
    setIsLoadingTickets(true);

    try {
      const response = await fetch("/api/support/tickets", { cache: "no-store" });
      const payload = (await response.json()) as {
        tickets?: TicketListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load support tickets.");
      }

      setTickets(payload.tickets || []);
    } catch (caughtError) {
      setFeedback({
        type: "error",
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load support tickets.",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  }

  function resetForm() {
    setIssueCategory(defaultCategory);
    setPriority(defaultPriority);
    setContactMethod("email");
    setBestContactTime("");
    setMessage("");
  }

  async function saveTicket(status: TicketStatus) {
    if (status === "submitted" && !message.trim()) {
      setFeedback({
        type: "error",
        text: "Please add a message before submitting the support ticket.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueCategory,
          priority,
          contactMethod,
          bestContactTime,
          message,
          status,
        }),
      });

      const payload = (await response.json()) as {
        ticketNumber?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save the support ticket.");
      }

      setFeedback({
        type: "success",
        text:
          status === "draft"
            ? `Draft saved as ${payload.ticketNumber}.`
            : `Support ticket ${payload.ticketNumber} submitted successfully.`,
      });
      resetForm();
      await loadTickets();
    } catch (caughtError) {
      setFeedback({
        type: "error",
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save the support ticket.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function submitDraftTicket(ticketId: string) {
    try {
      setIsSaving(true);
      setFeedback(null);

      const response = await fetch("/api/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ticketId,
          status: "submitted",
        }),
      });

      const payload = (await response.json()) as {
        ticketNumber?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit the draft ticket.");
      }

      setFeedback({
        type: "success",
        text: `Draft ticket ${payload.ticketNumber} submitted successfully.`,
      });
      await loadTickets();
    } catch (caughtError) {
      setFeedback({
        type: "error",
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to submit the draft ticket.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function formatUpdatedAt(value: string | null) {
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
    <section className="role-card customer-support-card">
      <div className="support-card-header">
        <div>
          <h3>Customer Support</h3>
          <p>{intro}</p>
        </div>
        <span className="support-badge">24/7 Ticket Intake</span>
      </div>

      <div className="support-contact-grid">
        <article className="support-contact-item">
          <span className="support-contact-label">Support Email</span>
          <strong>support@mamabalance.lk</strong>
          <p>Best for account issues, workflow clarifications, and bug reports with screenshots.</p>
        </article>
        <article className="support-contact-item">
          <span className="support-contact-label">Support Hotline</span>
          <strong>+94 11 245 7788</strong>
          <p>Use for urgent blocking issues during active clinic hours and scheduled field work.</p>
        </article>
        <article className="support-contact-item">
          <span className="support-contact-label">Response Targets</span>
          <strong>High: 2 hrs | Medium: 8 hrs</strong>
          <p>Low-priority tickets are typically reviewed within 1 business day.</p>
        </article>
      </div>

      <div className="form-grid support-form-grid">
        <div className="role-field">
          <label>Issue Category</label>
          <div className="support-select-wrap">
            <select value={issueCategory} onChange={(event) => setIssueCategory(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" className="support-select-icon" tabIndex={-1} aria-hidden="true">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
        <div className="role-field">
          <label>Priority</label>
          <div className="support-select-wrap">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TicketPriority)}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" className="support-select-icon" tabIndex={-1} aria-hidden="true">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
        <div className="role-field">
          <label>Preferred Contact Method</label>
          <div className="support-select-wrap">
            <select value={contactMethod} onChange={(event) => setContactMethod(event.target.value)}>
              <option value="email">Email</option>
              <option value="phone">Phone Call</option>
              <option value="in-app">In-App Follow-up</option>
            </select>
            <button type="button" className="support-select-icon" tabIndex={-1} aria-hidden="true">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
        <div className="role-field">
          <label>Best Time to Reach You</label>
          <input
            type="text"
            placeholder="Example: 2 PM - 4 PM"
            value={bestContactTime}
            onChange={(event) => setBestContactTime(event.target.value)}
          />
        </div>
        <div className="role-field wide">
          <label>Message</label>
          <textarea
            rows={5}
            placeholder="Describe the issue, affected user or mother record, error message, and the steps you already tried."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
      </div>

      <div className="support-note">
        Include screenshots, the affected role, and the exact page name to help support resolve the issue faster.
      </div>

      {feedback && (
        <div className={`support-feedback ${feedback.type}`}>{feedback.text}</div>
      )}

      <div className="role-actions">
        <button
          className="btn-outline"
          type="button"
          onClick={() => void saveTicket("draft")}
          disabled={isSaving}
        >
          Save Draft
        </button>
        <button
          className="btn-primary"
          type="button"
          onClick={() => void saveTicket("submitted")}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Submit Ticket"}
        </button>
      </div>

      <div className="support-history">
        <div className="support-history-header">
          <h4>Recent Tickets</h4>
          <button className="support-refresh" type="button" onClick={() => void loadTickets()}>
            Refresh
          </button>
        </div>

        {isLoadingTickets ? (
          <p className="support-history-empty">Loading your support tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="support-history-empty">No support tickets yet.</p>
        ) : (
          <div className="support-history-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="support-history-item">
                <div className="support-history-meta">
                  <strong>{ticket.ticketNumber}</strong>
                  <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
                </div>
                <div className="support-history-details">
                  <span>{ticket.issueCategory}</span>
                  <span className={`ticket-priority ${ticket.priority}`}>{ticket.priority}</span>
                  <span>{formatUpdatedAt(ticket.updatedAt)}</span>
                </div>
                <p>{ticket.message || "Draft ticket without a message yet."}</p>
                {ticket.status === "draft" && (
                  <div className="support-history-actions">
                    <button
                      className="btn-primary support-submit-draft"
                      type="button"
                      onClick={() => void submitDraftTicket(ticket.id)}
                      disabled={isSaving || !ticket.message.trim()}
                    >
                      Submit Draft
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
