import { NextRequest, NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

export { GET, PATCH } from "./liveRoute";

type MidwifeNotificationRow = {
  id: string;
  title: string;
  message: string;
  motherUid: string | null;
  motherName: string | null;
  score: number | null;
  riskLevel: string | null;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string | null;
  attemptedAt: string | null;
};

async function legacyGET() {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("notifications")
    .where("recipientUid", "==", actor.uid)
    .where("recipientRole", "==", "midwife")
    .get();

  const allNotifications = snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: String(data.title || "Notification"),
        message: String(data.message || ""),
        motherUid: (data.motherUid as string | undefined) || null,
        motherName: (data.motherName as string | undefined) || null,
        score:
          typeof data.score === "number"
            ? data.score
            : Number.isFinite(Number(data.score))
              ? Number(data.score)
              : null,
        riskLevel: (data.riskLevel as string | undefined) || null,
        priority:
          data.priority === "low" || data.priority === "high"
            ? data.priority
            : "medium",
        read: Boolean(data.read),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        attemptedAt: data.attemptedAt?.toDate?.()?.toISOString?.() ?? null,
      } satisfies MidwifeNotificationRow;
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

  const notifications = allNotifications.slice(0, 8);

  return NextResponse.json({
    notifications,
    unreadCount: allNotifications.filter((item) => !item.read).length,
  });
}

async function legacyPATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id?: string;
    markAll?: boolean;
  };

  if (payload.markAll) {
    const snapshot = await adminDb
      .collection("notifications")
      .where("recipientUid", "==", actor.uid)
      .where("recipientRole", "==", "midwife")
      .get();

    const unreadDocs = snapshot.docs.filter((doc) => !doc.data().read);

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

  if (data?.recipientUid !== actor.uid || data?.recipientRole !== "midwife") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await ref.update({
    read: true,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
