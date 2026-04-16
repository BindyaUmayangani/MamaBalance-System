import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/log";
import { adminDb } from "@/lib/firebase/admin";

type TicketPriority = "low" | "medium" | "high";
type TicketStatus = "draft" | "submitted";

const VALID_PRIORITIES = new Set<TicketPriority>(["low", "medium", "high"]);
const VALID_STATUSES = new Set<TicketStatus>(["draft", "submitted"]);

function buildTicketNumber() {
  return `SUP-${Date.now().toString().slice(-8)}`;
}

async function notifyRegionalAdminsForSubmittedTicket(ticket: {
  ticketId: string;
  ticketNumber: string;
  regionId: string | null;
  requesterUid: string;
  requesterRole: string;
  requesterName: string;
  issueCategory: string;
  priority: TicketPriority;
}) {
  if (!ticket.regionId) {
    return;
  }

  const regionalAdminSnapshot = await adminDb
    .collection("users")
    .where("role", "==", "regionaladmin")
    .get();

  const recipients = regionalAdminSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.regionId === ticket.regionId && data.status === "active";
  });

  if (recipients.length === 0) {
    return;
  }

  const writes = recipients.map((doc) =>
    adminDb.collection("notifications").add({
      recipientUid: doc.id,
      recipientRole: "regionaladmin",
      type: "support-ticket",
      title: "New Support Ticket",
      message: `${ticket.requesterName} submitted ${ticket.ticketNumber} (${ticket.issueCategory}).`,
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      requesterUid: ticket.requesterUid,
      requesterRole: ticket.requesterRole,
      requesterName: ticket.requesterName,
      issueCategory: ticket.issueCategory,
      priority: ticket.priority,
      regionId: ticket.regionId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  await Promise.all(writes);
}

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("supportTickets")
    .where("requesterUid", "==", actor.uid)
    .get();

  const tickets = snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ticketNumber: String(data.ticketNumber || doc.id),
        issueCategory: String(data.issueCategory || "General"),
        priority: VALID_PRIORITIES.has(data.priority as TicketPriority)
          ? (data.priority as TicketPriority)
          : "medium",
        status: VALID_STATUSES.has(data.status as TicketStatus)
          ? (data.status as TicketStatus)
          : "draft",
        message: String(data.message || ""),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    })
    .sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 5);

  return NextResponse.json({ tickets });
}

async function handleCreate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    issueCategory?: string;
    priority?: TicketPriority;
    contactMethod?: string;
    bestContactTime?: string;
    message?: string;
    status?: TicketStatus;
  };

  const issueCategory = String(payload.issueCategory || "").trim();
  const priority = VALID_PRIORITIES.has(payload.priority as TicketPriority)
    ? (payload.priority as TicketPriority)
    : "medium";
  const status = VALID_STATUSES.has(payload.status as TicketStatus)
    ? (payload.status as TicketStatus)
    : "draft";
  const contactMethod = String(payload.contactMethod || "email").trim() || "email";
  const bestContactTime = String(payload.bestContactTime || "").trim();
  const message = String(payload.message || "").trim();

  if (!issueCategory) {
    return NextResponse.json({ error: "Issue category is required." }, { status: 400 });
  }

  if (status === "submitted" && !message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const userSnapshot = await adminDb.collection("users").doc(actor.uid).get();
  const userData = userSnapshot.data();

  const ticketRef = adminDb.collection("supportTickets").doc();
  const ticketNumber = buildTicketNumber();

  await ticketRef.set({
    ticketNumber,
    requesterUid: actor.uid,
    requesterRole: actor.role,
    requesterEmail: actor.email || null,
    requesterName:
      actor.displayName ||
      (userData?.username as string | undefined) ||
      (userData?.email as string | undefined) ||
      "Unknown User",
    issueCategory,
    priority,
    contactMethod,
    bestContactTime: bestContactTime || null,
    message,
    status,
    regionId: actor.regionId || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (status === "submitted") {
    await notifyRegionalAdminsForSubmittedTicket({
      ticketId: ticketRef.id,
      ticketNumber,
      regionId: actor.regionId || null,
      requesterUid: actor.uid,
      requesterRole: actor.role,
      requesterName:
        actor.displayName ||
        (userData?.username as string | undefined) ||
        (userData?.email as string | undefined) ||
        "Unknown User",
      issueCategory,
      priority,
    });
  }

  await logAuditEvent({
    actor,
    module: "Support",
    actionType: status === "submitted" ? "Submit" : "Create",
    action: status === "submitted" ? "Submitted support ticket" : "Saved support ticket draft",
    target: ticketNumber,
  });

  return NextResponse.json({ ok: true, id: ticketRef.id, ticketNumber });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    status?: TicketStatus;
  };

  if (!payload.id) {
    return NextResponse.json({ error: "Ticket ID is required." }, { status: 400 });
  }

  if (payload.status !== "submitted") {
    return NextResponse.json({ error: "Unsupported status update." }, { status: 400 });
  }

  const ticketRef = adminDb.collection("supportTickets").doc(payload.id);
  const snapshot = await ticketRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const ticket = snapshot.data();

  if (ticket?.requesterUid !== actor.uid) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const message = String(ticket?.message || "").trim();

  if (!message) {
    return NextResponse.json(
      { error: "Add a message before submitting the draft ticket." },
      { status: 400 },
    );
  }

  await ticketRef.update({
    status: "submitted",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyRegionalAdminsForSubmittedTicket({
    ticketId: payload.id,
    ticketNumber: String(ticket?.ticketNumber || payload.id),
    regionId: (ticket?.regionId as string | null | undefined) || actor.regionId || null,
    requesterUid: String(ticket?.requesterUid || actor.uid),
    requesterRole: String(ticket?.requesterRole || actor.role),
    requesterName:
      String(ticket?.requesterName || "").trim() ||
      actor.displayName ||
      actor.email ||
      "Unknown User",
    issueCategory: String(ticket?.issueCategory || "General"),
    priority: VALID_PRIORITIES.has(ticket?.priority as TicketPriority)
      ? (ticket?.priority as TicketPriority)
      : "medium",
  });

  await logAuditEvent({
    actor,
    module: "Support",
    actionType: "Submit",
    action: "Submitted saved support ticket",
    target: String(ticket?.ticketNumber || payload.id),
  });

  return NextResponse.json({
    ok: true,
    ticketNumber: String(ticket?.ticketNumber || payload.id),
  });
}

export async function GET() {
  return handleList();
}

export async function POST(request: NextRequest) {
  return handleCreate(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
