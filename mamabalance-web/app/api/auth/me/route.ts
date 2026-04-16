import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getCurrentSessionUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const userSnapshot = await adminDb.collection("users").doc(user.uid).get();
  const userData = userSnapshot.data();

  let regionName: string | null = null;

  if (userData?.regionId) {
    const regionSnapshot = await adminDb
      .collection("regions")
      .doc(String(userData.regionId))
      .get();

    if (regionSnapshot.exists) {
      regionName =
        (regionSnapshot.data()?.name as string | undefined) ||
        String(userData.regionId);
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      username: (userData?.username as string | undefined) || null,
      personalEmail: (userData?.personalEmail as string | undefined) || null,
      regionName,
      profileImage: (userData?.profileImage as string | undefined) || null,
      coverImage: (userData?.coverImage as string | undefined) || null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    profileImage?: string | null;
    coverImage?: string | null;
  };

  try {
    await adminDb.collection("users").doc(user.uid).update({
      ...(payload.profileImage !== undefined && {
        profileImage: payload.profileImage,
      }),
      ...(payload.coverImage !== undefined && {
        coverImage: payload.coverImage,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
