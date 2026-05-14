import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const doctorIdentityMock = vi.hoisted(() => ({
  resolveLinkedDoctorUids: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    regions: [] as Array<{ id: string; data: Record<string, unknown> }>,
    mothers: [] as Array<{ id: string; data: Record<string, unknown> }>,
    doctorUsers: new Map<string, Record<string, unknown>>(),
    motherUsers: new Map<string, Record<string, unknown>>(),
    checkups: [] as Array<{ id: string; data: Record<string, unknown> }>,
  };

  function snapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
    return {
      empty: docs.length === 0,
      docs: docs.map((doc) => ({
        id: doc.id,
        exists: true,
        data: () => doc.data,
      })),
    };
  }

  const collection = vi.fn((name: string) => {
    if (name === "regions") {
      return {
        get: vi.fn(() => Promise.resolve(snapshot(state.regions))),
      };
    }

    if (name === "mothers") {
      return {
        where: vi.fn((_field: string, _operator: string, value: string) => ({
          get: vi.fn(() =>
            Promise.resolve(
              snapshot(
                state.mothers.filter(
                  (doc) => doc.data.assignedDoctorUid === value,
                ),
              ),
            ),
          ),
        })),
      };
    }

    if (name === "doctorCheckups") {
      return {
        where: vi.fn((_field: string, _operator: string, values: string[]) => ({
          get: vi.fn(() =>
            Promise.resolve(
              snapshot(
                state.checkups.filter((doc) =>
                  values.includes(String(doc.data.motherUid)),
                ),
              ),
            ),
          ),
        })),
      };
    }

    if (name === "users") {
      return {
        doc: vi.fn((uid: string) => ({
          get: vi.fn(() => {
            const data =
              state.doctorUsers.get(uid) || state.motherUsers.get(uid) || null;

            return Promise.resolve({
              id: uid,
              exists: Boolean(data),
              data: () => data,
            });
          }),
        })),
      };
    }

    throw new Error(`Unexpected collection: ${name}`);
  });

  return {
    adminDb: { collection },
    collection,
    state,
  };
});

vi.mock("@/lib/auth/server", () => ({
  getCurrentSessionUser: authServerMock.getCurrentSessionUser,
}));

vi.mock("@/lib/doctor/identity", () => ({
  resolveLinkedDoctorUids: doctorIdentityMock.resolveLinkedDoctorUids,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firestoreMock.adminDb,
}));

import { GET } from "./route";

const doctorActor = {
  uid: "doctor-1",
  role: "doctor",
  status: "active",
  email: "doctor@mamabalance.lk",
  phoneNumber: null,
  displayName: "Dr. Anjali",
};

function futureIsoDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(9, 0, 0, 0);

  return date.toISOString();
}

describe("GET /api/doctor/mothers integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.regions = [{ id: "colombo", data: { name: "Colombo" } }];
    firestoreMock.state.mothers = [];
    firestoreMock.state.doctorUsers = new Map();
    firestoreMock.state.motherUsers = new Map();
    firestoreMock.state.checkups = [];
  });

  it("rejects unauthenticated or non-doctor staff", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce({
      ...doctorActor,
      role: "midwife",
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
    expect(doctorIdentityMock.resolveLinkedDoctorUids).not.toHaveBeenCalled();
  });

  it("returns high-risk mothers assigned to the linked doctor identities", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce([
      "doctor-1",
      "doctor-linked",
    ]);
    firestoreMock.state.doctorUsers.set("doctor-1", {
      displayName: "Dr. Anjali",
    });
    firestoreMock.state.doctorUsers.set("doctor-linked", {
      displayName: "Dr. Linked",
    });
    firestoreMock.state.mothers = [
      {
        id: "mother-high",
        data: {
          assignedDoctorUid: "doctor-1",
          fullName: "Bimasha Perera",
          latestEpdsScore: 22,
          latestEpdsSubmittedAt: "2026-04-20T08:00:00.000Z",
          regionId: "colombo",
          phoneNumber: "0711111111",
        },
      },
      {
        id: "mother-low",
        data: {
          assignedDoctorUid: "doctor-1",
          fullName: "Chamari Silva",
          latestEpdsScore: 3,
          regionId: "colombo",
        },
      },
      {
        id: "mother-linked",
        data: {
          assignedDoctorUid: "doctor-linked",
          fullName: "Anoma Fernando",
          riskLevel: "high",
          latestEpdsScore: 18,
          regionId: "colombo",
        },
      },
    ];
    firestoreMock.state.motherUsers.set("mother-high", {
      userId: "MOTHER-001",
      username: "bimasha",
      email: "bimasha@example.com",
    });
    firestoreMock.state.motherUsers.set("mother-linked", {
      userId: "MOTHER-002",
      username: "anoma",
    });
    firestoreMock.state.checkups = [
      {
        id: "checkup-1",
        data: {
          motherUid: "mother-high",
          scheduledAt: futureIsoDate(7),
          status: "Upcoming",
        },
      },
    ];

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mothers).toHaveLength(2);
    expect(payload.mothers.map((mother: { name: string }) => mother.name)).toEqual([
      "Anoma Fernando",
      "Bimasha Perera",
    ]);
    expect(payload.mothers[1]).toEqual(
      expect.objectContaining({
        uid: "mother-high",
        userId: "MOTHER-001",
        username: "bimasha",
        risk: "high",
        lastEPDS: "22",
        assignedDoctor: "Dr. Anjali",
        region: "Colombo",
        contact: "0711111111",
      }),
    );
    expect(payload.mothers[1].upcomingCheckup).not.toBe("-");
    expect(payload.mothers[1].lastStatus).toBe("upcoming");
  });
});
