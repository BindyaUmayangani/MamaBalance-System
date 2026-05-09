import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { decryptMessageText, encryptMessageText } from "@/lib/messaging/encryption";

type MobileRole = "mother" | "guardian";

type MobileContext = {
  authUid: string;
  role: MobileRole;
  userDocId: string;
  motherDocId: string;
  mother: DocumentData;
  participantUid: string;
  participantRole: MobileRole;
};

type MobileConversation = {
  id: string;
  motherUid: string;
  participantUid: string;
  participantRole: MobileRole;
  careTeamUid: string;
  careTeamRole: "doctor" | "midwife";
  careTeamName: string;
  careTeamIsOnline: boolean;
  careTeamLastActiveAt: string | null;
};

function readString(value: unknown) {
  return String(value || "").trim();
}

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

function conversationId(motherUid: string, staffUid: string, role: "doctor" | "midwife") {
  return `${motherUid}_${role}_${staffUid}`;
}

function isOnline(lastActiveAt: string | null) {
  if (!lastActiveAt) return false;
  const timestamp = new Date(lastActiveAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= 2 * 60 * 1000;
}

async function readUserPresence(uid: string) {
  if (!uid) return { isOnline: false, lastActiveAt: null };
  const snapshot = await adminDb.collection("users").doc(uid).get();
  const data = snapshot.data() || {};
  const lastActiveAt = toIso(data.lastActiveAt || data.lastSeenAt || data.updatedAt);
  return {
    isOnline: isOnline(lastActiveAt),
    lastActiveAt,
  };
}

async function markUserActive(userDocId: string) {
  if (!userDocId) return;
  await adminDb.collection("users").doc(userDocId).set(
    {
      lastActiveAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function verifyMobileRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  return adminAuth.verifyIdToken(token);
}

async function findUserDoc(decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>) {
  const direct = await adminDb.collection("users").doc(decoded.uid).get();
  if (direct.exists) return direct;

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb
      .collection("users")
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();
    if (!byPhone.empty) return byPhone.docs[0];
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byEmail = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!byEmail.empty) return byEmail.docs[0];

    const byPersonalEmail = await adminDb
      .collection("users")
      .where("personalEmail", "==", email)
      .limit(1)
      .get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }

  return null;
}

async function findMotherForMother(
  userDocId: string,
  decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>,
) {
  const direct = await adminDb.collection("mothers").doc(userDocId).get();
  if (direct.exists) return direct;

  const byUserUid = await adminDb
    .collection("mothers")
    .where("userUid", "==", userDocId)
    .limit(1)
    .get();
  if (!byUserUid.empty) return byUserUid.docs[0];

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byPhone = await adminDb
      .collection("mothers")
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();
    if (!byPhone.empty) return byPhone.docs[0];
  }

  const email = readString(decoded.email).toLowerCase();
  if (email) {
    const byPersonalEmail = await adminDb
      .collection("mothers")
      .where("personalEmail", "==", email)
      .limit(1)
      .get();
    if (!byPersonalEmail.empty) return byPersonalEmail.docs[0];
  }

  return null;
}

async function findMotherForGuardian(
  userDocId: string,
  decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>,
) {
  const byGuardianUid = await adminDb
    .collection("mothers")
    .where("guardianUid", "==", userDocId)
    .limit(1)
    .get();
  if (!byGuardianUid.empty) return byGuardianUid.docs[0];

  const phone = readString(decoded.phone_number);
  if (phone) {
    const byGuardianContact = await adminDb
      .collection("mothers")
      .where("guardianContact", "==", phone)
      .limit(1)
      .get();
    if (!byGuardianContact.empty) return byGuardianContact.docs[0];
  }

  const link = await adminDb
    .collection("guardianLinks")
    .where("guardianUid", "==", userDocId)
    .where("isActive", "==", true)
    .limit(1)
    .get();
  const motherId = readString(link.docs[0]?.data().motherId);
  if (motherId) {
    const motherDoc = await adminDb.collection("mothers").doc(motherId).get();
    if (motherDoc.exists) return motherDoc;
  }

  return null;
}

async function resolveMobileContext(request: NextRequest): Promise<MobileContext | NextResponse> {
  const decoded = await verifyMobileRequest(request);
  const userDoc = await findUserDoc(decoded);

  if (!userDoc?.exists) {
    return NextResponse.json(
      { error: "This account has not been registered in MamaBalance yet." },
      { status: 404 },
    );
  }

  const user = userDoc.data() || {};
  const role = readString(user.role).toLowerCase() as MobileRole;
  const status = readString(user.status).toLowerCase();

  if (!["mother", "guardian"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized mobile account." }, { status: 403 });
  }

  if (status !== "active") {
    return NextResponse.json({ error: "Your account is not active yet." }, { status: 403 });
  }

  const motherDoc =
    role === "guardian"
      ? await findMotherForGuardian(userDoc.id, decoded)
      : await findMotherForMother(userDoc.id, decoded);

  if (!motherDoc?.exists) {
    return NextResponse.json(
      { error: "Unable to find your linked mother profile." },
      { status: 404 },
    );
  }

  return {
    authUid: decoded.uid,
    role,
    userDocId: userDoc.id,
    motherDocId: motherDoc.id,
    mother: motherDoc.data() || {},
    participantUid: role === "guardian" ? userDoc.id : motherDoc.id,
    participantRole: role,
  };
}

async function staffName(staffUid: string, role: "doctor" | "midwife") {
  if (!staffUid) {
    return role === "doctor" ? "Assigned doctor" : "Assigned midwife";
  }

  const staffDoc = await adminDb.collection("users").doc(staffUid).get();
  const staff = staffDoc.data() || {};
  const raw = readString(staff.displayName || staff.fullName);

  if (role === "doctor") {
    if (!raw || raw.toLowerCase() === "doctor") return "Assigned doctor";
    return raw.toLowerCase().startsWith("dr.") ? raw : `Dr. ${raw}`;
  }

  if (!raw || raw.toLowerCase() === "midwife") return "Assigned midwife";
  return raw.toLowerCase().startsWith("midwife ") ? raw : `Midwife ${raw}`;
}

async function buildOptions(context: MobileContext) {
  const doctorUid = readString(context.mother.assignedDoctorUid);
  const midwifeUid = readString(context.mother.assignedMidwifeUid);

  if (!midwifeUid) {
    throw new Error("No midwife has been assigned yet.");
  }

  const [doctorPresence, midwifePresence] = await Promise.all([
    doctorUid ? readUserPresence(doctorUid) : Promise.resolve({ isOnline: false, lastActiveAt: null }),
    readUserPresence(midwifeUid),
  ]);

  const doctor: MobileConversation | null = doctorUid
    ? {
        id: conversationId(context.motherDocId, doctorUid, "doctor"),
        motherUid: context.motherDocId,
        participantUid: context.participantUid,
        participantRole: context.participantRole,
        careTeamUid: doctorUid,
        careTeamRole: "doctor",
        careTeamName: await staffName(doctorUid, "doctor"),
        careTeamIsOnline: doctorPresence.isOnline,
        careTeamLastActiveAt: doctorPresence.lastActiveAt,
      }
    : null;

  const midwife: MobileConversation = {
    id: conversationId(context.motherDocId, midwifeUid, "midwife"),
    motherUid: context.motherDocId,
    participantUid: context.participantUid,
    participantRole: context.participantRole,
    careTeamUid: midwifeUid,
    careTeamRole: "midwife",
    careTeamName: await staffName(midwifeUid, "midwife"),
    careTeamIsOnline: midwifePresence.isOnline,
    careTeamLastActiveAt: midwifePresence.lastActiveAt,
  };

  return { doctor, midwife };
}

function conversationList(options: Awaited<ReturnType<typeof buildOptions>>) {
  return [options.doctor, options.midwife].filter(Boolean) as MobileConversation[];
}

async function assertConversation(
  context: MobileContext,
  conversationIdValue: string,
) {
  const options = await buildOptions(context);
  const conversation = conversationList(options).find((item) => item.id === conversationIdValue);

  if (!conversation) {
    throw new Error("This conversation is not available for your account.");
  }

  return { options, conversation };
}

async function ensureConversation(conversation: MobileConversation) {
  const conversationRef = adminDb.collection("conversations").doc(conversation.id);
  const snapshot = await conversationRef.get();
  if (snapshot.exists) return;

  await conversationRef.set(
    {
      motherUid: conversation.motherUid,
      ...(conversation.careTeamRole === "doctor"
        ? { doctorUid: conversation.careTeamUid }
        : { midwifeUid: conversation.careTeamUid }),
      careTeamRole: conversation.careTeamRole,
      participantUids: [
        conversation.motherUid,
        conversation.participantUid,
        conversation.careTeamUid,
      ],
      isOpen: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function readMessages(conversationIdValue: string) {
  const snapshot = await adminDb
    .collection("conversations")
    .doc(conversationIdValue)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      senderUid: readString(data.senderUid),
      senderRole: readString(data.senderRole),
      text: decryptMessageText(data),
      createdAt: toIso(data.createdAt),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    const url = new URL(request.url);
    const requestedConversationId = readString(url.searchParams.get("conversationId"));
    await markUserActive(context.userDocId);
    const options = await buildOptions(context);

    if (!requestedConversationId) {
      return NextResponse.json({ ok: true, options });
    }

    const { conversation } = await assertConversation(context, requestedConversationId);
    await ensureConversation(conversation);
    const messages = await readMessages(conversation.id);

    return NextResponse.json({ ok: true, options, conversation, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load messages.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    const payload = (await request.json()) as {
      conversationId?: string;
      text?: string;
    };
    const requestedConversationId = readString(payload.conversationId);
    const text = readString(payload.text);
    await markUserActive(context.userDocId);

    if (!requestedConversationId || !text) {
      return NextResponse.json(
        { error: "Conversation and message are required." },
        { status: 400 },
      );
    }

    const { conversation } = await assertConversation(context, requestedConversationId);
    const conversationRef = adminDb.collection("conversations").doc(conversation.id);
    const messageRef = conversationRef.collection("messages").doc();
    const encrypted = encryptMessageText(text);

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(
        conversationRef,
        {
          motherUid: conversation.motherUid,
          ...(conversation.careTeamRole === "doctor"
            ? { doctorUid: conversation.careTeamUid }
            : { midwifeUid: conversation.careTeamUid }),
          careTeamRole: conversation.careTeamRole,
          participantUids: [
            conversation.motherUid,
            conversation.participantUid,
            conversation.careTeamUid,
          ],
          isOpen: true,
          lastMessageText: "Secure message",
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessageSenderUid: context.authUid,
          ...(context.participantRole === "mother"
            ? { lastReadByMotherAt: FieldValue.serverTimestamp() }
            : { lastReadByGuardianAt: FieldValue.serverTimestamp() }),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(messageRef, {
        senderUid: context.authUid,
        senderRole: context.participantRole,
        ...encrypted,
        attachments: [],
        readBy: [context.authUid],
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    const payload = (await request.json()) as { conversationId?: string };
    const requestedConversationId = readString(payload.conversationId);
    await markUserActive(context.userDocId);

    if (!requestedConversationId) {
      return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
    }

    const { conversation } = await assertConversation(context, requestedConversationId);
    await ensureConversation(conversation);

    await adminDb.collection("conversations").doc(conversation.id).set(
      {
        ...(context.participantRole === "mother"
          ? { lastReadByMotherAt: FieldValue.serverTimestamp() }
          : { lastReadByGuardianAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update conversation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
