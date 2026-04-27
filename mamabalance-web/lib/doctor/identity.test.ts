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

import { loadDoctorCollectionByLinkedUids, resolveLinkedDoctorUids } from "./identity";
import type { UserProfile } from "@/lib/auth/types";

function createSnapshot(
  docs: Array<{ id: string; data: () => Record<string, unknown> }> = [],
) {
  return { docs };
}

const doctorActor: UserProfile = {
  uid: "doctor-primary",
  role: "doctor",
  status: "active",
  email: "doctor@mamabalance.lk",
  personalEmail: "doctor.personal@example.com",
  phoneNumber: null,
  displayName: "Doctor One",
  username: "doctor.one",
};

describe("doctor identity integration helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the actor uid for non-doctor staff", async () => {
    const result = await resolveLinkedDoctorUids({
      ...doctorActor,
      role: "midwife",
    });

    expect(result).toEqual(["doctor-primary"]);
    expect(firebaseAdminMock.collection).not.toHaveBeenCalled();
  });

  it("resolves active linked doctor identities by email, personal email, and username", async () => {
    firebaseAdminMock.get
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "doctor-email-match", data: () => ({ status: "active" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "doctor-disabled-match", data: () => ({ status: "disabled" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "doctor-username-match", data: () => ({ status: "active" }) },
          { id: "doctor-email-match", data: () => ({ status: "active" }) },
        ]),
      );

    const result = await resolveLinkedDoctorUids(doctorActor);

    expect(result).toEqual([
      "doctor-primary",
      "doctor-email-match",
      "doctor-username-match",
    ]);
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("role", "==", "doctor");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("email", "==", "doctor@mamabalance.lk");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "personalEmail",
      "==",
      "doctor.personal@example.com",
    );
    expect(firebaseAdminMock.where).toHaveBeenCalledWith("username", "==", "doctor.one");
  });

  it("loads doctor-owned collection docs in Firestore 'in' query chunks", async () => {
    const doctorUids = Array.from({ length: 12 }, (_, index) => `doctor-${index + 1}`);
    firebaseAdminMock.get
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "obs-1", data: () => ({ title: "First observation" }) },
        ]),
      )
      .mockResolvedValueOnce(
        createSnapshot([
          { id: "obs-2", data: () => ({ title: "Second observation" }) },
        ]),
      );

    const result = await loadDoctorCollectionByLinkedUids(
      "doctorObservations",
      "doctorUid",
      doctorUids,
    );

    expect(result).toEqual([
      { id: "obs-1", data: { title: "First observation" } },
      { id: "obs-2", data: { title: "Second observation" } },
    ]);
    expect(firebaseAdminMock.collection).toHaveBeenCalledWith("doctorObservations");
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "doctorUid",
      "in",
      doctorUids.slice(0, 10),
    );
    expect(firebaseAdminMock.where).toHaveBeenCalledWith(
      "doctorUid",
      "in",
      doctorUids.slice(10),
    );
  });
});
