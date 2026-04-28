import { NextRequest, NextResponse } from "next/server";

import { resolveMobileContext } from "@/lib/mobile/context";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;

    return NextResponse.json({
      ok: true,
      session: {
        uid: context.userDocId,
        role: context.role,
        status: "active",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify session.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
