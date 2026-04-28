import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";
import { readString, resolveMobileContext, toIso } from "@/lib/mobile/context";

async function staffDetails(uid: string) {
  if (!uid) return { name: "", phoneNumber: "" };
  const doc = await adminDb.collection("users").doc(uid).get();
  const data = doc.data() || {};
  return {
    name: readString(data.displayName || data.fullName),
    phoneNumber: readString(data.phoneNumber),
  };
}

function dateLike(value: unknown) {
  const iso = toIso(value);
  return iso ? iso.split("T")[0] : readString(value, "-");
}

function parseImageDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!match) return null;
  const contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const extension =
    contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return {
    contentType,
    extension,
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function storeProfileImage(motherDocId: string, value: string) {
  const image = parseImageDataUrl(value);
  if (!image) return { imageUrl: value, imagePath: "" };
  if (image.buffer.length > 5 * 1024 * 1024) {
    throw new Error("Profile image must be smaller than 5MB.");
  }

  const token = randomUUID();
  const path = `mobile-profile-images/${motherDocId}/${Date.now()}.${image.extension}`;
  const bucket = adminStorage.bucket();
  await bucket.file(path).save(image.buffer, {
    metadata: {
      contentType: image.contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
    resumable: false,
  });

  const encodedPath = encodeURIComponent(path);
  return {
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`,
    imagePath: path,
  };
}

async function profilePayload(context: Awaited<ReturnType<typeof resolveMobileContext>>) {
  if (context instanceof NextResponse) return context;
  const doctorUid = readString(context.mother.assignedDoctorUid);
  const midwifeUid = readString(context.mother.assignedMidwifeUid);
  const [doctor, midwife] = await Promise.all([
    staffDetails(doctorUid),
    staffDetails(midwifeUid),
  ]);

  return {
    ok: true,
    profile: {
      uid: context.userDocId,
      motherId: context.motherDocId,
      fullName: readString(context.mother.fullName || context.user.displayName, "Mother"),
      loginEmail: readString(context.user.email, "-"),
      personalEmail: readString(context.mother.personalEmail || context.user.personalEmail || context.user.email, "-"),
      phoneNumber: readString(context.mother.phoneNumber || context.user.phoneNumber, "-"),
      birthdate: dateLike(context.mother.birthdate),
      address: readString(context.mother.address, "-"),
      guardianName: readString(context.mother.guardianName, "-"),
      guardianContact: readString(context.mother.guardianContact, "-"),
      deliveryDate: dateLike(context.mother.deliveryDate),
      noOfChildren: Number(context.mother.noOfChildren || 0),
      profileImageUrl: readString(context.mother.profileImage || context.user.profileImage),
      profileImagePath: readString(context.mother.profileImagePath || context.user.profileImagePath),
      assignedDoctorUid: doctorUid || null,
      assignedMidwifeUid: midwifeUid || null,
      assignedDoctorName: doctor.name,
      assignedDoctorPhoneNumber: doctor.phoneNumber,
      assignedMidwifeName: midwife.name,
      assignedMidwifePhoneNumber: midwife.phoneNumber,
      latestEpdsScore: Number(context.mother.latestEpdsScore || 0),
      latestEpdsDate: toIso(context.mother.latestEpdsSubmittedAt),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    const payload = await profilePayload(context);
    if (payload instanceof NextResponse) return payload;
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await resolveMobileContext(request);
    if (context instanceof NextResponse) return context;
    const payload = await request.json();

    const userUpdates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const motherUpdates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    if ("fullName" in payload) {
      userUpdates.displayName = readString(payload.fullName);
      motherUpdates.fullName = readString(payload.fullName);
    }
    if ("personalEmail" in payload) {
      userUpdates.personalEmail = readString(payload.personalEmail).toLowerCase();
      motherUpdates.personalEmail = readString(payload.personalEmail).toLowerCase();
    }
    if ("phoneNumber" in payload) {
      userUpdates.phoneNumber = readString(payload.phoneNumber);
      motherUpdates.phoneNumber = readString(payload.phoneNumber);
    }
    for (const key of ["birthdate", "address", "guardianName", "guardianContact", "deliveryDate"]) {
      if (key in payload) motherUpdates[key] = readString(payload[key]);
    }
    if ("noOfChildren" in payload) motherUpdates.noOfChildren = Number(payload.noOfChildren || 0);
    if ("profileImageUrl" in payload) {
      const storedImage = await storeProfileImage(context.motherDocId, readString(payload.profileImageUrl));
      userUpdates.profileImage = storedImage.imageUrl;
      motherUpdates.profileImage = storedImage.imageUrl;
      if (storedImage.imagePath) {
        userUpdates.profileImagePath = storedImage.imagePath;
        motherUpdates.profileImagePath = storedImage.imagePath;
      }
    }
    if ("profileImagePath" in payload) {
      const explicitPath = readString(payload.profileImagePath);
      if (explicitPath) {
        userUpdates.profileImagePath = explicitPath;
        motherUpdates.profileImagePath = explicitPath;
      }
    }

    await Promise.all([
      adminDb.collection("users").doc(context.userDocId).set(userUpdates, { merge: true }),
      adminDb.collection("mothers").doc(context.motherDocId).set(motherUpdates, { merge: true }),
      userUpdates.displayName
        ? adminAuth.updateUser(context.authUid, { displayName: String(userUpdates.displayName) })
        : Promise.resolve(),
    ]);

    const nextContext = await resolveMobileContext(request);
    const nextPayload = await profilePayload(nextContext);
    if (nextPayload instanceof NextResponse) return nextPayload;
    return NextResponse.json(nextPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
