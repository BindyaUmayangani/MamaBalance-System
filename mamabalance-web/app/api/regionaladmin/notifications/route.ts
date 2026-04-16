import { NextRequest, NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/log";
import { adminDb } from "@/lib/firebase/admin";

type NotificationRow = {
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

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("notifications")
    .where("recipientUid", "==", actor.uid)
    .get();

  const notifications = snapshot.docs
    .filter((doc) => doc.data().recipientRole === "regionaladmin" && !doc.data().dismissed)
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: String(data.title || "Notification"),
        message: String(data.message || ""),
        ticketId: (data.ticketId as string | undefined) || null,
        ticketNumber: (data.ticketNumber as string | undefined) || null,
        issueCategory: (data.issueCategory as string | undefined) || null,
        priority:
          data.priority === "low" || data.priority === "high" ? data.priority : "medium",
        read: Boolean(data.read),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        requesterName: (data.requesterName as string | undefined) || null,
        requesterRole: (data.requesterRole as string | undefined) || null,
      } satisfies NotificationRow;
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
  });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "regionaladmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    markAll?: boolean;
    dismiss?: boolean;
  };

  if (payload.markAll) {
    const snapshot = await adminDb
      .collection("notifications")
      .where("recipientUid", "==", actor.uid)
      .get();

    const unreadDocs = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.recipientRole === "regionaladmin" && !data.read;
    });

    if (unreadDocs.length > 0) {
      const batch = adminDb.batch();
      unreadDocs.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }

    await logAuditEvent({
      actor,
      module: "Notifications",
      actionType: "Read",
      action: "Marked all inbox notifications as read",
      target: `Regional inbox (${unreadDocs.length} notifications)`,
    });

    return NextResponse.json({ ok: true });
  }

  if (!payload.id) {
    return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
  }

  const ref = adminDb.collection("notifications").doc(payload.id);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  const data = snapshot.data();

  if (data?.recipientUid !== actor.uid || data?.recipientRole !== "regionaladmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await ref.update({
    ...(payload.dismiss ? { dismissed: true } : { read: true }),
    updatedAt: new Date().toISOString(),
  });

  await logAuditEvent({
    actor,
    module: "Notifications",
    actionType: payload.dismiss ? "Dismiss" : "Read",
    action: payload.dismiss ? "Dismissed inbox notification" : "Read inbox notification",
    target: String(data?.ticketNumber || payload.id),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return handleList();
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
