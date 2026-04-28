import { NextRequest, NextResponse } from "next/server";

import { resolveMobileContext } from "@/lib/mobile/context";

function normalize(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalize(item),
      ]),
    );
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    return NextResponse.json({
      ok: true,
      context: {
        role: context.role,
        userId: context.userDocId,
        motherId: context.motherDocId,
        user: normalize(context.user),
        mother: normalize(context.mother),
        guardianLink: normalize(context.guardianLink || null),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load account context.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
