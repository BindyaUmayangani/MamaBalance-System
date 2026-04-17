import { NextRequest, NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/log";
import { adminDb } from "@/lib/firebase/admin";
import { buildSuperadminNotifications } from "@/lib/superadmin/notifications";

async function handleList() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const notifications = await buildSuperadminNotifications(actor.uid);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
  });
}

async function handleUpdate(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    markAll?: boolean;
    dismiss?: boolean;
  };

  if (payload.markAll) {
    const notifications = await buildSuperadminNotifications(actor.uid);
    const unreadNotifications = notifications.filter((item) => !item.read);

    if (unreadNotifications.length > 0) {
      const batch = adminDb.batch();

      unreadNotifications.forEach((item) => {
        if (item.id.startsWith("stored:")) {
          batch.update(
            adminDb.collection("notifications").doc(item.id.replace(/^stored:/, "")),
            {
              read: true,
              updatedAt: new Date().toISOString(),
            },
          );
          return;
        }

        batch.set(
          adminDb
            .collection("superadminNotificationStates")
            .doc(`${actor.uid}__${item.id}`),
          {
            recipientUid: actor.uid,
            notificationKey: item.id,
            read: true,
            dismissed: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });

      await batch.commit();
    }

    await logAuditEvent({
      actor,
      module: "Notifications",
      actionType: "Read",
      action: "Marked all superadmin inbox notifications as read",
      target: `Superadmin inbox (${unreadNotifications.length} notifications)`,
    });

    return NextResponse.json({ ok: true });
  }

  if (!payload.id) {
    return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
  }

  const notifications = await buildSuperadminNotifications(actor.uid);
  const target = notifications.find((item) => item.id === payload.id);

  if (!target) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  if (target.id.startsWith("stored:")) {
    await adminDb.collection("notifications").doc(target.id.replace(/^stored:/, "")).update({
      ...(payload.dismiss ? { dismissed: true } : { read: true }),
      updatedAt: new Date().toISOString(),
    });
  } else {
    await adminDb
      .collection("superadminNotificationStates")
      .doc(`${actor.uid}__${target.id}`)
      .set(
        {
          recipientUid: actor.uid,
          notificationKey: target.id,
          read: payload.dismiss ? target.read : true,
          dismissed: Boolean(payload.dismiss),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  }

  await logAuditEvent({
    actor,
    module: "Notifications",
    actionType: payload.dismiss ? "Dismiss" : "Read",
    action: payload.dismiss ? "Dismissed superadmin inbox notification" : "Read superadmin inbox notification",
    target: String(target.ticketNumber || target.title || payload.id),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return handleList();
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
