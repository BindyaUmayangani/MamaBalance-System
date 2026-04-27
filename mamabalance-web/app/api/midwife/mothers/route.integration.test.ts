import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const midwifeIdentityMock = vi.hoisted(() => ({
  loadMidwifeCollectionByLinkedUids: vi.fn(),
  resolveLinkedMidwifeUids: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  logAuditEvent: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    regions: [] as Array<{ id: string; data: Record<string, unknown> }>,
    mothers: new Map<string, Record<string, unknown>>(),
    users: new Map<string, Record<string, unknown>>(),
    updates: [] as Array<{ uid: string; data: Record<string, unknown> }>,
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
        where: vi.fn((_field: string, _operator: string, values: string[]) => ({
          get: vi.fn(() =>
            Promise.resolve(
              snapshot(
                [...state.mothers.entries()]
                  .filter(([, data]) =>
                    values.includes(String(data.assignedMidwifeUid)),
                  )
                  .map(([id, data]) => ({ id, data })),
              ),
            ),
          ),
        })),
        doc: vi.fn((uid: string) => ({
          get: vi.fn(() => {
            const data = state.mothers.get(uid) || null;

            return Promise.resolve({
              id: uid,
              exists: Boolean(data),
              data: () => data,
            });
          }),
          update: vi.fn((data: Record<string, unknown>) => {
            state.updates.push({ uid, data });
            return Promise.resolve();
          }),
        })),
      };
    }

    if (name === "users") {
      return {
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn((_field3: string, _operator3: string, regionId: string) => ({
              get: vi.fn(() =>
                Promise.resolve(
                  snapshot(
                    [...state.users.entries()]
                      .filter(
                        ([, data]) =>
                          data.role === "doctor" &&
                          data.status === "active" &&
                          data.regionId === regionId,
                      )
                      .map(([id, data]) => ({ id, data })),
                  ),
                ),
              ),
            })),
            get: vi.fn(() =>
              Promise.resolve(
                snapshot(
                  [...state.users.entries()]
                    .filter(
                      ([, data]) =>
                        data.role === "doctor" && data.status === "active",
                    )
                    .map(([id, data]) => ({ id, data })),
                ),
              ),
            ),
          })),
        })),
        doc: vi.fn((uid: string) => ({
          get: vi.fn(() => {
            const data = state.users.get(uid) || null;

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

vi.mock("@/lib/midwife/identity", () => ({
  loadMidwifeCollectionByLinkedUids:
    midwifeIdentityMock.loadMidwifeCollectionByLinkedUids,
  resolveLinkedMidwifeUids: midwifeIdentityMock.resolveLinkedMidwifeUids,
}));

vi.mock("@/lib/audit/log", () => ({
  logAuditEvent: auditMock.logAuditEvent,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firestoreMock.adminDb,
}));

import { GET, PATCH } from "./route";

const midwifeActor = {
  uid: "midwife-1",
  role: "midwife",
  status: "active",
  email: "midwife@mamabalance.lk",
  phoneNumber: null,
  displayName: "Midwife One",
  regionId: "colombo",
};

function createRequest(url: string) {
  return new NextRequest(url);
}

function createPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/midwife/mothers", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("GET /api/midwife/mothers integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.regions = [{ id: "colombo", data: { name: "Colombo" } }];
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.users = new Map();
    firestoreMock.state.updates = [];
    midwifeIdentityMock.loadMidwifeCollectionByLinkedUids.mockResolvedValue([]);
  });

  it("rejects non-midwife staff", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce({
      ...midwifeActor,
      role: "doctor",
    });

    const response = await GET(createRequest("http://localhost/api/midwife/mothers"));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
  });

  it("rejects invalid list scopes", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);

    const response = await GET(
      createRequest("http://localhost/api/midwife/mothers?scope=other"),
    );

    await expect(response.json()).resolves.toEqual({ error: "Invalid scope." });
    expect(response.status).toBe(400);
  });

  it("returns assigned mothers and same-region doctor options", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    midwifeIdentityMock.loadMidwifeCollectionByLinkedUids.mockResolvedValueOnce([
      {
        id: "visit-1",
        data: {
          motherUid: "mother-1",
          scheduledAt: "2026-05-02T09:00:00.000Z",
          status: "Upcoming",
        },
      },
    ]);
    firestoreMock.state.users.set("doctor-1", {
      role: "doctor",
      status: "active",
      displayName: "Dr. Colombo",
      regionId: "colombo",
    });
    firestoreMock.state.users.set("doctor-2", {
      role: "doctor",
      status: "active",
      displayName: "Dr. Galle",
      regionId: "galle",
    });
    firestoreMock.state.users.set("mother-1", {
      userId: "MOTHER-001",
      username: "amara",
      email: "amara@example.com",
    });
    firestoreMock.state.mothers.set("mother-1", {
      assignedMidwifeUid: "midwife-1",
      assignedDoctorUid: "doctor-1",
      fullName: "Amara Silva",
      latestEpdsScore: 12,
      regionId: "colombo",
    });

    const response = await GET(createRequest("http://localhost/api/midwife/mothers"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.doctors).toEqual([{ uid: "doctor-1", name: "Dr. Colombo" }]);
    expect(payload.mothers).toEqual([
      expect.objectContaining({
        uid: "mother-1",
        userId: "MOTHER-001",
        username: "amara",
        name: "Amara Silva",
        risk: "moderate",
        assignedDoctor: "Dr. Colombo",
        assignedDoctorUid: "doctor-1",
      }),
    ]);
    expect(payload.mothers[0].upcomingCheckup).not.toBe("-");
  });
});

describe("PATCH /api/midwife/mothers integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.regions = [];
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.users = new Map();
    firestoreMock.state.updates = [];
  });

  it("validates required assignment fields", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);

    const response = await PATCH(createPatchRequest({ motherUid: "mother-1" }));

    await expect(response.json()).resolves.toEqual({
      error: "Mother and doctor are required.",
    });
    expect(response.status).toBe(400);
  });

  it("assigns an active same-region doctor to an owned mother", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedMidwifeUid: "midwife-1",
      fullName: "Amara Silva",
    });
    firestoreMock.state.users.set("doctor-1", {
      role: "doctor",
      status: "active",
      displayName: "Dr. Colombo",
      regionId: "colombo",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({ motherUid: "mother-1", doctorUid: "doctor-1" }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.updates).toEqual([
      {
        uid: "mother-1",
        data: expect.objectContaining({
          assignedDoctorUid: "doctor-1",
          assignedDoctorAssignedAt: expect.anything(),
          updatedAt: expect.anything(),
        }),
      },
    ]);
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: midwifeActor,
        actionType: "Assign",
        target: "Amara Silva",
        metadata: expect.objectContaining({
          motherUid: "mother-1",
          doctorUid: "doctor-1",
          doctorName: "Dr. Colombo",
        }),
      }),
    );
  });
});
