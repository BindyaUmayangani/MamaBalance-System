import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";

import { buildUserCode, formatDate } from "@/lib/admin/format";
import { logAuditEvent } from "@/lib/audit/log";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import {
  EducationalContentPayload,
  EducationalContentRecord,
  getEducationalContentTypeLabel,
  getEducationalContentVisibilityLabel,
  isEducationalContentType,
  isEducationalContentVisibility,
} from "@/lib/education/types";

const COLLECTION_NAME = "educationalContents";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidYoutubeUrl(value: string) {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

function formatTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return formatDate(value.toDate());
  }

  if (value instanceof Date || typeof value === "string") {
    return formatDate(value);
  }

  return "-";
}

function normalizeStoragePath(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildContentRecord(
  id: string,
  data: DocumentData,
  userNameMap: Map<string, string>,
): EducationalContentRecord {
  const type = isEducationalContentType(data.type) ? data.type : "link";
  const visibility =
    data.visibility === "hidden" ? "hidden" : "visible";

  return {
    id,
    contentId: (data.contentId as string | undefined) || buildUserCode("CT", id),
    title: (data.title as string | undefined) || "-",
    description: (data.description as string | undefined) || "-",
    type,
    typeLabel: getEducationalContentTypeLabel(type),
    dateAdded: formatTimestamp(data.createdAt),
    visibility,
    visibilityLabel: getEducationalContentVisibilityLabel(visibility),
    posterUrl:
      (data.posterUrl as string | undefined)?.trim() || null,
    posterPath: normalizeStoragePath(data.posterPath),
    resourceUrl: (data.resourceUrl as string | undefined) || "",
    resourcePath: normalizeStoragePath(data.resourcePath),
    createdByName:
      userNameMap.get((data.createdByUid as string | undefined) || "") || "-",
  };
}

async function loadCreatorNameMap() {
  const snapshot = await adminDb.collection("users").get();

  return new Map(
    snapshot.docs.map((doc) => [
      doc.id,
      ((doc.data().displayName as string | undefined) || doc.id) as string,
    ]),
  );
}

async function deleteStorageObject(path: string | null) {
  if (!path) {
    return;
  }

  try {
    await adminStorage.bucket().file(path).delete();
  } catch {
    // Ignore missing files so record cleanup can continue.
  }
}

function validatePayload(payload: Partial<EducationalContentPayload>) {
  if (!payload.title?.trim()) {
    return "Title is required.";
  }

  if (!payload.description?.trim()) {
    return "Description is required.";
  }

  if (!isEducationalContentType(payload.type)) {
    return "Invalid content type.";
  }

  if (!isEducationalContentVisibility(payload.visibility)) {
    return "Invalid visibility value.";
  }

  if (!payload.resourceUrl?.trim()) {
    return "Please provide the content resource.";
  }

  if (payload.type === "youtube" && !isValidYoutubeUrl(payload.resourceUrl)) {
    return "Please provide a valid YouTube URL.";
  }

  if (payload.type === "link" && !isValidHttpUrl(payload.resourceUrl)) {
    return "Please provide a valid link URL.";
  }

  if ((payload.type === "video" || payload.type === "pdf") && !payload.resourcePath) {
    return "Please upload the required file before saving.";
  }

  return null;
}

export async function GET() {
  const actor = await getCurrentSessionUser();

  if (!actor || !["superadmin", "regionaladmin"].includes(actor.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await adminDb.collection(COLLECTION_NAME).get();
  const creators = await loadCreatorNameMap();

  const contents = snapshot.docs
    .map((doc) => buildContentRecord(doc.id, doc.data(), creators))
    .sort((left, right) => right.dateAdded.localeCompare(left.dateAdded));

  return NextResponse.json({ contents });
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as EducationalContentPayload;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc();
  const createdAt = FieldValue.serverTimestamp();

  await docRef.set({
    contentId: buildUserCode("CT", docRef.id),
    title: payload.title.trim(),
    description: payload.description.trim(),
    type: payload.type,
    visibility: payload.visibility,
    posterUrl: payload.posterUrl?.trim() || null,
    posterPath: payload.posterPath?.trim() || null,
    resourceUrl: payload.resourceUrl.trim(),
    resourcePath: payload.resourcePath?.trim() || null,
    createdAt,
    updatedAt: createdAt,
    createdByUid: actor.uid,
  });

  await logAuditEvent({
    actor,
    module: "Content",
    actionType: "Create",
    action: "Created educational content",
    target: payload.title.trim(),
  });

  const storedSnapshot = await docRef.get();
  const creatorNameMap = new Map([[actor.uid, actor.displayName || actor.uid]]);

  return NextResponse.json({
    ok: true,
    content: buildContentRecord(docRef.id, storedSnapshot.data() || {}, creatorNameMap),
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as EducationalContentPayload & { id?: string };

  if (!payload.id?.trim()) {
    return NextResponse.json({ error: "Content ID is required." }, { status: 400 });
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc(payload.id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const previous = snapshot.data() || {};
  const previousPosterPath = normalizeStoragePath(previous.posterPath);
  const previousResourcePath = normalizeStoragePath(previous.resourcePath);

  await docRef.update({
    title: payload.title.trim(),
    description: payload.description.trim(),
    type: payload.type,
    visibility: payload.visibility,
    posterUrl: payload.posterUrl?.trim() || null,
    posterPath: payload.posterPath?.trim() || null,
    resourceUrl: payload.resourceUrl.trim(),
    resourcePath: payload.resourcePath?.trim() || null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: actor.uid,
  });

  if (previousPosterPath && previousPosterPath !== payload.posterPath?.trim()) {
    await deleteStorageObject(previousPosterPath);
  }

  if (previousResourcePath && previousResourcePath !== payload.resourcePath?.trim()) {
    await deleteStorageObject(previousResourcePath);
  }

  const storedSnapshot = await docRef.get();
  const creators = await loadCreatorNameMap();

  await logAuditEvent({
    actor,
    module: "Content",
    actionType: "Update",
    action: "Updated educational content",
    target: payload.title.trim(),
  });

  return NextResponse.json({
    ok: true,
    content: buildContentRecord(payload.id, storedSnapshot.data() || {}, creators),
  });
}

export async function DELETE(request: NextRequest) {
  const actor = await getCurrentSessionUser();

  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { id?: string };

  if (!payload.id?.trim()) {
    return NextResponse.json({ error: "Content ID is required." }, { status: 400 });
  }

  const docRef = adminDb.collection(COLLECTION_NAME).doc(payload.id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const existing = snapshot.data() || {};

  await deleteStorageObject(normalizeStoragePath(existing.posterPath));
  await deleteStorageObject(normalizeStoragePath(existing.resourcePath));
  await docRef.delete();

  await logAuditEvent({
    actor,
    module: "Content",
    actionType: "Delete",
    action: "Deleted educational content",
    target: String(existing.title || payload.id),
  });

  return NextResponse.json({ ok: true });
}
