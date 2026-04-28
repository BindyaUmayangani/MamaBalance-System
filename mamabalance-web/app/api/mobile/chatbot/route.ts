import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import {
  type MobileContext,
  readString,
  resolveMobileContext,
  toIso,
} from "@/lib/mobile/context";

export const runtime = "nodejs";

type ChatbotHistoryMessage = {
  role?: string;
  text?: string;
};

const MODEL = process.env.OPENAI_CHATBOT_MODEL || "gpt-4o-mini";
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 900;
const MAX_HISTORY_TEXT_LENGTH = 600;
const MINUTE_LIMIT = Number(process.env.CHATBOT_RATE_LIMIT_PER_MINUTE || 8);
const DAY_LIMIT = Number(process.env.CHATBOT_RATE_LIMIT_PER_DAY || 40);

const OUT_OF_SCOPE_RESPONSE =
  "I can only help with pregnancy, postpartum wellbeing, motherhood, EPDS check-ins, emotional support, calming ideas, and MamaBalance care guidance. Please ask me something related to your wellbeing or care journey.";

function openAiKey() {
  return process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || "";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Mother";
}

function epdsRisk(score: number) {
  if (score >= 13) return "High";
  if (score >= 10) return "Moderate";
  return "Low";
}

function matchedHighRiskPhrases(message: string) {
  const normalized = message.toLowerCase();
  const phrases = [
    "kill myself",
    "want to die",
    "end my life",
    "end it all",
    "self harm",
    "self-harm",
    "suicide",
    "suicidal",
    "hurt myself",
    "harm myself",
    "better off dead",
    "i cannot go on",
    "i can't go on",
    "no reason to live",
    "wish i was dead",
    "want to disappear",
    "cannot cope",
    "can't cope",
    "i am hopeless",
    "feel hopeless",
    "severe panic",
    "panic attack",
    "cannot care for my baby",
    "can't care for my baby",
    "cannot take care of my baby",
    "extreme distress",
  ];

  return phrases.filter((phrase) => normalized.includes(phrase));
}

function isOnTopic(message: string) {
  if (matchedHighRiskPhrases(message).length > 0) return true;

  const normalized = message.toLowerCase();
  const terms = [
    "pregnant",
    "pregnancy",
    "postpartum",
    "after birth",
    "birth",
    "baby",
    "mother",
    "motherhood",
    "breastfeeding",
    "sleep",
    "tired",
    "exhausted",
    "anxious",
    "anxiety",
    "sad",
    "crying",
    "overwhelmed",
    "stress",
    "stressed",
    "calm",
    "calming",
    "mood",
    "depression",
    "epds",
    "check-in",
    "doctor",
    "midwife",
    "care team",
    "medicine",
    "medication",
    "visit",
    "appointment",
    "guardian",
    "family",
    "support",
    "wellbeing",
    "mental health",
    "cope",
    "routine",
  ];

  return terms.some((term) => normalized.includes(term));
}

function cleanHistory(rawHistory: unknown) {
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  return history
    .filter((item): item is ChatbotHistoryMessage => item && typeof item === "object")
    .map((item) => {
      const role = readString(item.role).toLowerCase() === "user" ? "user" : "assistant";
      const content = readString(item.text).slice(0, MAX_HISTORY_TEXT_LENGTH);
      return content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-MAX_HISTORY_MESSAGES) as Array<{ role: "user" | "assistant"; content: string }>;
}

async function assertRateLimit(authUid: string) {
  const now = new Date();
  const minuteWindowMs = 60 * 1000;
  const dayWindowMs = 24 * 60 * 60 * 1000;
  const ref = adminDb.collection("mobileChatbotRateLimits").doc(authUid);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const minuteStart = toIso(data.minuteWindowStart);
    const dayStart = toIso(data.dayWindowStart);
    const minuteStartMs = minuteStart ? new Date(minuteStart).getTime() : 0;
    const dayStartMs = dayStart ? new Date(dayStart).getTime() : 0;
    const resetMinute = !minuteStartMs || now.getTime() - minuteStartMs >= minuteWindowMs;
    const resetDay = !dayStartMs || now.getTime() - dayStartMs >= dayWindowMs;
    const minuteCount = resetMinute ? 0 : Number(data.minuteCount || 0);
    const dayCount = resetDay ? 0 : Number(data.dayCount || 0);

    if (minuteCount >= MINUTE_LIMIT) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((minuteWindowMs - (now.getTime() - minuteStartMs)) / 1000)) };
    }

    if (dayCount >= DAY_LIMIT) {
      return { allowed: false, retryAfterSeconds: Math.max(60, Math.ceil((dayWindowMs - (now.getTime() - dayStartMs)) / 1000)) };
    }

    transaction.set(
      ref,
      {
        minuteWindowStart: resetMinute ? Timestamp.fromDate(now) : data.minuteWindowStart,
        minuteCount: minuteCount + 1,
        dayWindowStart: resetDay ? Timestamp.fromDate(now) : data.dayWindowStart,
        dayCount: dayCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { allowed: true, retryAfterSeconds: 0 };
  });

  return result;
}

type ResolvedMobileContext = MobileContext;

function buildContext(context: ResolvedMobileContext) {
  const mother = context.mother;
  const score = Number(mother.latestEpdsScore || 0);
  const fullName = readString(mother.fullName || context.user.displayName, "Mother");
  const doctorAssigned = readString(mother.assignedDoctorUid).length > 0;
  const midwifeAssigned = readString(mother.assignedMidwifeUid).length > 0;

  return [
    `Mother name: ${fullName}`,
    `Mother first name: ${firstName(fullName)}`,
    `Number of children: ${Number(mother.noOfChildren || 0)}`,
    `Delivery date or expected date: ${readString(mother.deliveryDate, "Unknown")}`,
    `Latest EPDS score: ${score}`,
    `Current EPDS risk band: ${epdsRisk(score)}`,
    `Latest EPDS submitted at: ${toIso(mother.latestEpdsSubmittedAt) || "Unknown"}`,
    `Assigned doctor available: ${doctorAssigned ? "Yes" : "No"}`,
    `Assigned midwife available: ${midwifeAssigned ? "Yes" : "No"}`,
  ].join("\n");
}

function systemPrompt(profileContext: string) {
  return `You are MamaBalance Supportive Companion, a postpartum wellbeing companion inside the MamaBalance mobile app.

Strict scope:
- Only answer questions about pregnancy, postpartum wellbeing, motherhood, EPDS check-ins, emotional support, calming ideas, baby-care stress, care visits, medication reminders, and MamaBalance care-team guidance.
- If the user asks about anything outside this scope, reply only with a brief refusal and invite an on-topic wellbeing or care question.
- Never answer general trivia, coding, finance, politics, entertainment, homework, or unrelated medical topics.

Safety:
- Do not diagnose, prescribe, or replace a doctor, midwife, or emergency care.
- If the user suggests self-harm, suicide, severe panic, inability to cope, or inability to care for the baby:
  1. Respond warmly and urgently.
  2. Encourage contacting a trusted person immediately.
  3. Encourage contacting the assigned doctor or midwife right away.
  4. Include Sri Lanka support numbers: NIMH 1926 and Sumithrayo 011 269 6666.
  5. End with [CRISIS_DETECTED].

Style:
- Warm, calm, brief, and practical.
- Use short paragraphs.
- Give one or two realistic next steps.
- Avoid repeated apologies and avoid long bullet lists.

Mother context:
${profileContext}`;
}

async function notifyCareTeam(context: ResolvedMobileContext, safetyTriggers: string[]) {
  const targets = [
    { uid: readString(context.mother.assignedMidwifeUid), role: "midwife" },
    { uid: readString(context.mother.assignedDoctorUid), role: "doctor" },
  ].filter((target) => target.uid);

  if (targets.length === 0) return;

  const motherName = readString(context.mother.fullName || context.user.displayName, "A mother");
  const triggerSummary = safetyTriggers.length > 0 ? safetyTriggers.slice(0, 3).join(", ") : "urgent emotional distress";
  const batch = adminDb.batch();

  for (const target of targets) {
    const docRef = adminDb.collection("notifications").doc();
    batch.set(docRef, {
      recipientUid: target.uid,
      recipientRole: target.role,
      type: "high_risk",
      subType: "chatbot_crisis",
      title: "Urgent: Chatbot Crisis Detection",
      message: `${motherName} may need urgent follow-up after an AI chat session. Safety trigger: ${triggerSummary}.`,
      motherUid: context.motherDocId,
      motherName,
      read: false,
      priority: "high",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

async function callOpenAi(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = openAiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the web backend.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.45,
        max_tokens: 260,
        n: 1,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    } | null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || "OpenAI request failed.");
    }

    const text = readString(payload?.choices?.[0]?.message?.content);
    if (!text) throw new Error("OpenAI returned an empty response.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    const payload = (await request.json()) as {
      message?: string;
      history?: unknown;
    };
    const message = readString(payload.message).slice(0, MAX_MESSAGE_LENGTH);

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (!isOnTopic(message)) {
      return NextResponse.json({ ok: true, response: OUT_OF_SCOPE_RESPONSE, onTopic: false });
    }

    const rateLimit = await assertRateLimit(context.authUid);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Please wait a moment before sending another chatbot message.", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 },
      );
    }

    const safetyTriggers = matchedHighRiskPhrases(message);
    const history = cleanHistory(payload.history);
    const response = await callOpenAi([
      { role: "system", content: systemPrompt(buildContext(context)) },
      ...history,
      { role: "user", content: message },
    ]);

    const crisisDetected = safetyTriggers.length > 0 || response.includes("[CRISIS_DETECTED]");
    const cleanResponse = response.replace(/\[CRISIS_DETECTED\]\s*/g, "").trim();

    if (crisisDetected) {
      await notifyCareTeam(context, safetyTriggers);
    }

    return NextResponse.json({
      ok: true,
      response: cleanResponse || "I'm here with you. Please send that once more so I can support you.",
      crisisDetected,
      onTopic: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate chatbot response.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
