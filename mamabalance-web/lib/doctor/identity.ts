import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import type { UserProfile } from "@/lib/auth/types";
import { adminDb } from "@/lib/firebase/admin";

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

async function runUserQuery(field: string, value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const snapshot = await adminDb
    .collection("users")
    .where("role", "==", "doctor")
    .where(field, "==", value)
    .get();

  return snapshot.docs;
}

export async function resolveLinkedDoctorUids(actor: UserProfile) {
  const uidSet = new Set<string>([actor.uid]);

  if (actor.role !== "doctor") {
    return [actor.uid];
  }

  const [emailMatches, personalMatches, usernameMatches] = await Promise.all([
    runUserQuery("email", actor.email),
    runUserQuery("personalEmail", actor.personalEmail),
    runUserQuery("username", actor.username),
  ]);

  [...emailMatches, ...personalMatches, ...usernameMatches].forEach((doc) => {
    const data = doc.data();

    if (data.status === "active") {
      uidSet.add(doc.id);
    }
  });

  return [...uidSet];
}

export async function loadDoctorCollectionByLinkedUids(
  collectionName: string,
  field: string,
  doctorUids: string[],
) {
  const snapshots = await Promise.all(
    chunk(doctorUids, 10).map((uids) =>
      adminDb.collection(collectionName).where(field, "in", uids).get(),
    ),
  );

  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as DocumentData,
    })),
  );
}
