import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

function readString(value: unknown, fallback = "") {
  const raw = String(value || "").trim();
  return raw || fallback;
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

async function verifyMobileRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) throw new Error("Please sign in to continue.");
  await adminAuth.verifyIdToken(token);
}

function matchesAudience(data: Record<string, unknown>, audience: string) {
  const normalized = new Set<string>();
  const directAudience = data.audience;
  if (typeof directAudience === "string" && directAudience.trim()) {
    normalized.add(directAudience.trim().toLowerCase());
  }
  for (const key of ["audienceTags", "audiences"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      value
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
        .forEach((item) => normalized.add(item));
    }
  }

  const requested = audience.trim().toLowerCase();
  if (requested === "guardian") {
    return normalized.has("guardian") || normalized.has("father");
  }
  if (normalized.size === 0) return requested === "mother";
  return normalized.has(requested) || normalized.has("all");
}

export async function GET(request: NextRequest) {
  try {
    await verifyMobileRequest(request);
    const url = new URL(request.url);
    const audience = readString(url.searchParams.get("audience"), "mother");
    const snapshot = await adminDb
      .collection("educationalContents")
      .where("visibility", "==", "visible")
      .get();

    const resources = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((data) => matchesAudience(data, audience))
      .map((data) => ({
        id: String(data.id),
        title: readString(data.title, "Untitled resource"),
        description: readString(data.description),
        type: readString(data.type, "link"),
        resourceUrl: readString(data.resourceUrl),
        posterUrl: readString(data.posterUrl) || null,
        createdAt: toIso(data.createdAt),
      }))
      .filter((resource) => resource.resourceUrl)
      .sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return NextResponse.json({ ok: true, resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load resources.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
