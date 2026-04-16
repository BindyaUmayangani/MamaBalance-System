import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveLinkedMidwifeUids } from "@/lib/midwife/identity";
import { decryptMessageText, encryptMessageText } from "@/lib/messaging/encryption";

type MotherConversation = {
  id: string;
  motherUid: string;
  motherName: string;
  role: string;
  lastMessageText: string;
  lastMessageAt: string | null;
  lastMessageSenderUid: string;
  unread: boolean;
};

type CurrentStaff = {
  uid: string;
  displayName: string | null;
  username: string | null;
  email: string | null;
};

function toIso(value: unknown) {
  const timestamp = value as { toDate?: () => Date };
  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : value instanceof Date
        ? value
        : value
          ? new Date(String(value))
          : null;

  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function conversationId(motherUid: string, midwifeUid: string) {
  return `${motherUid}_midwife_${midwifeUid}`;
}

function motherName(mother: DocumentData, user?: DocumentData) {
  return String(mother.fullName || user?.displayName || user?.username || "Unknown Mother");
}

function isUnreadConversation(conversation: DocumentData, actorUid: string) {
  const lastReadByMidwifeAt = toIso(conversation.lastReadByMidwifeAt);
  const lastMessageAt = toIso(conversation.lastMessageAt);

  return (
    Boolean(lastMessageAt) &&
    String(conversation.lastMessageSenderUid || "") !== actorUid &&
    (!lastReadByMidwifeAt || lastMessageAt! > lastReadByMidwifeAt)
  );
}

async function getAssignedMothers(midwifeUids: string[]) {
  const snapshots = await Promise.all(
    midwifeUids.map((uid) =>
      adminDb.collection("mothers").where("assignedMidwifeUid", "==", uid).get(),
    ),
  );

  return Array.from(
    new Map(snapshots.flatMap((snapshot) => snapshot.docs).map((doc) => [doc.id, doc])).values(),
  );
}

async function handleList(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);
  const assignedMotherDocs = await getAssignedMothers(linkedMidwifeUids);
  const url = new URL(request.url);
  const selectedConversationId = url.searchParams.get("conversationId") || "";

  if (url.searchParams.get("summary") === "unread") {
    const conversationSnapshots = await Promise.all(
      assignedMotherDocs.map((doc) => {
        const assignedMidwifeUid = String(doc.data().assignedMidwifeUid || actor.uid);
        return adminDb.collection("conversations").doc(conversationId(doc.id, assignedMidwifeUid)).get();
      }),
    );
    const unreadCount = conversationSnapshots.filter((doc) =>
      isUnreadConversation(doc.data() || {}, actor.uid),
    ).length;

    return NextResponse.json({ unreadCount });
  }

  const actorSnapshot = await adminDb.collection("users").doc(actor.uid).get();
  const actorData = actorSnapshot.data() || {};
  const currentStaff: CurrentStaff = {
    uid: actor.uid,
    displayName: actor.displayName || String(actorData.displayName || "") || null,
    username: actor.username || String(actorData.username || "") || null,
    email: actor.email || String(actorData.email || "") || null,
  };

  if (assignedMotherDocs.length === 0) {
    return NextResponse.json({ conversations: [], messages: [], currentStaff });
  }

  const [userSnapshots, conversationSnapshots] = await Promise.all([
    Promise.all(assignedMotherDocs.map((doc) => adminDb.collection("users").doc(doc.id).get())),
    Promise.all(
      assignedMotherDocs.map((doc) => {
        const assignedMidwifeUid = String(doc.data().assignedMidwifeUid || actor.uid);
        return adminDb.collection("conversations").doc(conversationId(doc.id, assignedMidwifeUid)).get();
      }),
    ),
  ]);

  const userMap = new Map(
    userSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );

  const conversations: MotherConversation[] = assignedMotherDocs.map((doc, index) => {
    const mother = doc.data();
    const assignedMidwifeUid = String(mother.assignedMidwifeUid || actor.uid);
    const conversationDoc = conversationSnapshots[index];
    const conversation = conversationDoc.data() || {};
    const lastMessageAt = toIso(conversation.lastMessageAt);

    return {
      id: conversationId(doc.id, assignedMidwifeUid),
      motherUid: doc.id,
      motherName: motherName(mother, userMap.get(doc.id)),
      role: mother.isHighRisk || mother.riskLevel === "high" ? "High-risk mother" : "Mother",
      lastMessageText: String(conversation.lastMessageText || "No messages yet"),
      lastMessageAt,
      lastMessageSenderUid: String(conversation.lastMessageSenderUid || ""),
      unread: isUnreadConversation(conversation, actor.uid),
    };
  });

  conversations.sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) return a.motherName.localeCompare(b.motherName);
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  const activeConversation = conversations.find((item) => item.id === selectedConversationId) || conversations[0];
  const messageSnapshot = await adminDb
    .collection("conversations")
    .doc(activeConversation.id)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  if (messageSnapshot.docs.length > 0) {
    await adminDb.collection("conversations").doc(activeConversation.id).set(
      {
        lastReadByMidwifeAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const messages = messageSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      senderUid: String(data.senderUid || ""),
      senderRole: String(data.senderRole || ""),
      text: decryptMessageText(data),
      createdAt: toIso(data.createdAt),
    };
  });

  return NextResponse.json({ conversations, activeConversationId: activeConversation.id, messages, currentStaff });
}

async function handleSend(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "midwife") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();
  const motherUid = String(payload.motherUid || "");
  const text = String(payload.text || "").trim();

  if (!motherUid || !text) {
    return NextResponse.json({ error: "Mother and message are required." }, { status: 400 });
  }

  const linkedMidwifeUids = await resolveLinkedMidwifeUids(actor);
  const motherDoc = await adminDb.collection("mothers").doc(motherUid).get();

  if (!motherDoc.exists) {
    return NextResponse.json({ error: "Mother not found." }, { status: 404 });
  }

  const mother = motherDoc.data() || {};
  const midwifeUid = String(mother.assignedMidwifeUid || "");

  if (!linkedMidwifeUids.includes(midwifeUid)) {
    return NextResponse.json({ error: "You can only message assigned mothers." }, { status: 403 });
  }

  const id = conversationId(motherUid, midwifeUid);
  const conversationRef = adminDb.collection("conversations").doc(id);
  const messageRef = conversationRef.collection("messages").doc();
  const encrypted = encryptMessageText(text);

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(
      conversationRef,
      {
        motherUid,
        midwifeUid,
        careTeamRole: "midwife",
        participantUids: [motherUid, midwifeUid],
        isOpen: true,
        lastMessageText: "Secure message",
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageSenderUid: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(messageRef, {
      senderUid: actor.uid,
      senderRole: "midwife",
      ...encrypted,
      attachments: [],
      readBy: [actor.uid],
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({ ok: true, conversationId: id });
}

export async function GET(request: NextRequest) {
  return handleList(request);
}

export async function POST(request: NextRequest) {
  return handleSend(request);
}
