import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAdminMock = vi.hoisted(() => {
  const get = vi.fn();
  const where = vi.fn(() => ({ where, get }));
  const collection = vi.fn(() => ({ where }));

  return {
    adminDb: { collection },
    collection,
    get,
    where,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firebaseAdminMock.adminDb,
}));

import {
  loadMidwifeCollectionByLinkedUids,
  loadMidwifeMothersByLinkedUids,
  resolveLinkedMidwifeUids,
} from "./identity";
import type { UserProfile } from "@/lib/auth/types";

function createSnapshot(
  docs: Array<{ id: string; data: () => Record<string, unknown> }> = [],
) {
  return { docs };
}

const midwifeActor: UserProfile = {
  uid: "midwife-primary",
  role: "midwife",
  status: "active",
  email: "midwife@mamabalance.lk",
  personalEmail: "midwife.personal@example.com",
  phoneNumber: null,
  displayName: "Midwife One",
  username: "midwife.one",
};

describe("midwife identity integration helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the actor uid for non-midwife staff", async () => {
    const result = await resolveLinkedMidwifeUids({
      ...midwifeActor,
      role: "doctor",
    });

    expect(result).toEqual(["midwife-primary"]);
    expect(firebaseAdminMock.collection).not.toHaveBeenCalled();
  });

  it("resolves active linked midwife identities by email, personal email, and username", async () => {
    firebaseAdminMock.get
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "midwife-email-match", data: () => ({ status: "active" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "midwife-disabled-match", data: () => ({ status: "disabled" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "midwife-username-match", data: () => ({ status: "active" }) },
        ]),
      );

    const result = await resolveLinkedMidwifeUids(midwifeActor);

    expect(result).toEqual([
      "midwife-primary",
      "midwife-email-match",
      "midwife-username-match",
    ]);
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("role", "==", "midwife");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("email", "==", "midwife@mamabalance.lk");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "personalEmail",
      "==",
      "midwife.personal@example.com",
    );
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("username", "==", "midwife.one");
  });

  it("loads mothers assigned to linked midwife identities in Firestore chunks", async () => {
    const midwifeUids = Array.from({ length: 11 }, (_, index) => `midwife-${index + 1}`);
    firebaseAdminMock.get
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "mother-1", data: () => ({ fullName: "Amara Silva" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "mother-2", data: () => ({ fullName: "Nimali Perera" }) },
        ]),
      );

    const result = await loadMidwifeMothersByLinkedUids(midwifeUids);

    expect(result).toEqual([
      { uid: "mother-1", data: { fullName: "Amara Silva" } },
      { uid: "mother-2", data: { fullName: "Nimali Perera" } },
    ]);
    expect(firebaseAdminMock.collection).toHaveBeenCalledWith("mothers");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "assignedMidwifeUid",
      "in",
      midwifeUids.slice(0, 10),
    );
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "assignedMidwifeUid",
      "in",
      midwifeUids.slice(10),
    );
  });

  it("loads midwife-owned collection docs by configurable owner field", async () => {
    firebaseAdminMock.get.mockResolvedValueOnce(
      createSnapshot([
        { id: "visit-1", data: () => ({ status: "Upcoming" }) },
      ]),
    );

    const result = await loadMidwifeCollectionByLinkedUids(
      "midwifeVisits",
      "midwifeUid",
      ["midwife-primary"],
    );

    expect(result).toEqual([{ id: "visit-1", data: { status: "Upcoming" } }]);
    expect(firebaseAdminMock.collection).toHaveBeenCalledWith("midwifeVisits");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "midwifeUid",
      "in",
      ["midwife-primary"],
    );
  });
});
