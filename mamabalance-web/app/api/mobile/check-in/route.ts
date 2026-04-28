import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { readString, resolveMobileContext, toIso } from "@/lib/mobile/context";

const CHECK_IN_WINDOW_DAYS = 7;

function nextAvailableAtFrom(lastSubmittedAt: Date | null) {
  if (!lastSubmittedAt) return null;
  const next = new Date(lastSubmittedAt);
  next.setDate(next.getDate() + CHECK_IN_WINDOW_DAYS);
  return next;
}

function riskLevel(score: number) {
  if (score >= 13) return "high";
  if (score >= 10) return "moderate";
  return "low";
}

function assertUnlocked(lastSubmittedAt: Date | null) {
  const next = nextAvailableAtFrom(lastSubmittedAt);
  if (next && next > new Date()) {
    throw new Error(`You can complete your next weekly check-in after ${next.toISOString().split("T")[0]}.`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    const lastIso = toIso(context.mother.latestEpdsSubmittedAt);
    const lastSubmittedAt = lastIso ? new Date(lastIso) : null;
    const nextAvailableAt = nextAvailableAtFrom(lastSubmittedAt);
    return NextResponse.json({
      ok: true,
      availability: {
        canStart: !nextAvailableAt || nextAvailableAt <= new Date(),
        lastSubmittedAt: lastSubmittedAt?.toISOString() || null,
        nextAvailableAt: nextAvailableAt?.toISOString() || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load check-in availability.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    if (context.role !== "mother") {
      return NextResponse.json({ error: "Only mothers can submit weekly check-ins." }, { status: 403 });
    }

    const payload = await request.json();
    const answers = Array.isArray(payload.answers) ? payload.answers.map(Number) : [];
    const score = Number(payload.score || 0);
    const language = readString(payload.language, "en");
    const motherRef = adminDb.collection("mothers").doc(context.motherDocId);
    const attemptRef = motherRef.collection("epdsAttempts").doc();
    const attemptedAt = new Date();
    const level = riskLevel(score);

    await adminDb.runTransaction(async (transaction) => {
      const fresh = await transaction.get(motherRef);
      const freshIso = toIso(fresh.data()?.latestEpdsSubmittedAt);
      assertUnlocked(freshIso ? new Date(freshIso) : null);
      transaction.set(attemptRef, {
        motherUid: context.motherDocId,
        answers,
        language,
        score,
        riskLevel: level,
        attemptedAt: Timestamp.fromDate(attemptedAt),
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(
        motherRef,
        {
          latestEpdsScore: score,
          latestEpdsAttemptId: attemptRef.id,
          latestEpdsLanguage: language,
          latestEpdsSubmittedAt: Timestamp.fromDate(attemptedAt),
          riskLevel: level,
          isHighRisk: level === "high",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    const assignedMidwifeUid = readString(context.mother.assignedMidwifeUid);
    if (level === "high" && assignedMidwifeUid) {
      const motherName = readString(context.mother.fullName || context.mother.username, "A mother");
      await adminDb.collection("notifications").add({
        recipientUid: assignedMidwifeUid,
        recipientRole: "midwife",
        type: "high-risk-epds",
        title: "High-risk mother identified",
        message: `${motherName} submitted an EPDS score of ${score} and needs early follow-up.`,
        motherUid: context.motherDocId,
        motherName,
        score,
        riskLevel: "high",
        attemptId: attemptRef.id,
        attemptedAt: Timestamp.fromDate(attemptedAt),
        read: false,
        priority: "high",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      ok: true,
      result: {
        attemptId: attemptRef.id,
        motherUid: context.motherDocId,
        score,
        riskLevel: level,
        attemptedAt: attemptedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit check-in.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
