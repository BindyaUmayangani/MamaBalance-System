import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const midwifeIdentityMock = vi.hoisted(() => ({
  loadMidwifeCollectionByLinkedUids: vi.fn(),
  loadMidwifeMothersByLinkedUids: vi.fn(),
  resolveLinkedMidwifeUids: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  logAuditEvent: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    mothers: new Map<string, Record<string, unknown>>(),
    visits: new Map<string, Record<string, unknown>>(),
    addedVisits: [] as Record<string, unknown>[],
    updates: [] as Array<{ id: string; data: Record<string, unknown> }>,
  };

  const collection = vi.fn((name: string) => {
    if (name === "mothers") {
      return {
        doc: vi.fn((uid: string) => ({
          get: vi.fn(() => {
            const data = state.mothers.get(uid) || null;

            return Promise.resolve({
              id: uid,
              exists: Boolean(data),
              data: () => data,
            });
          }),
        })),
      };
    }

    if (name === "midwifeVisits") {
      return {
        add: vi.fn((data: Record<string, unknown>) => {
          state.addedVisits.push(data);
          return Promise.resolve({ id: "visit-new" });
        }),
        doc: vi.fn((id: string) => ({
          delete: vi.fn(() => Promise.resolve()),
          get: vi.fn(() => {
            const data = state.visits.get(id) || null;

            return Promise.resolve({
              id,
              exists: Boolean(data),
              data: () => data,
            });
          }),
          update: vi.fn((data: Record<string, unknown>) => {
            state.updates.push({ id, data });
            return Promise.resolve();
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
  loadMidwifeMothersByLinkedUids: midwifeIdentityMock.loadMidwifeMothersByLinkedUids,
  resolveLinkedMidwifeUids: midwifeIdentityMock.resolveLinkedMidwifeUids,
}));

vi.mock("@/lib/audit/log", () => ({
  logAuditEvent: auditMock.logAuditEvent,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firestoreMock.adminDb,
}));

import { PATCH, POST } from "./route";

const midwifeActor = {
  uid: "midwife-1",
  role: "midwife",
  status: "active",
  email: "midwife@mamabalance.lk",
  phoneNumber: null,
  displayName: "Midwife One",
  regionId: "colombo",
};

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/midwife/visits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function createPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/midwife/visits", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("POST /api/midwife/visits integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.visits = new Map();
    firestoreMock.state.addedVisits = [];
    firestoreMock.state.updates = [];
  });

  it("validates required visit fields", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);

    const response = await POST(createRequest({ motherUid: "mother-1" }));

    await expect(response.json()).resolves.toEqual({ error: "Missing required fields." });
    expect(response.status).toBe(400);
  });

  it("blocks creating visits for mothers assigned to another midwife", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedMidwifeUid: "midwife-other",
      fullName: "Amara Silva",
    });

    const response = await POST(
      createRequest({
        motherUid: "mother-1",
        visitType: "home",
        dateTime: "2026-05-10T09:30",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "You can only create visits for your assigned mothers.",
    });
    expect(response.status).toBe(403);
  });

  it("creates a visit for an assigned mother and records an audit event", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedMidwifeUid: "midwife-1",
      fullName: "Amara Silva",
      riskLevel: "high",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await POST(
      createRequest({
        motherUid: "mother-1",
        visitType: "clinic",
        dateTime: "2026-05-10T09:30",
        notes: "Follow-up after EPDS screening",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.addedVisits).toEqual([
      expect.objectContaining({
        motherUid: "mother-1",
        motherName: "Amara Silva",
        riskLevel: "High",
        visitType: "clinic",
        notes: "Follow-up after EPDS screening",
        midwifeUid: "midwife-1",
        regionId: "colombo",
      }),
    ]);
    expect(firestoreMock.state.addedVisits[0].scheduledAt).toEqual(
      expect.stringMatching(/^2026-05-10T/),
    );
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: midwifeActor,
        module: "Visits",
        actionType: "Create",
        target: "Amara Silva",
      }),
    );
  });
});

describe("PATCH /api/midwife/visits integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.visits = new Map();
    firestoreMock.state.addedVisits = [];
    firestoreMock.state.updates = [];
  });

  it("reschedules an owned visit and writes audit metadata", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    firestoreMock.state.visits.set("visit-1", {
      motherUid: "mother-1",
      motherName: "Amara Silva",
      midwifeUid: "midwife-1",
      scheduledAt: "2026-05-01T09:00:00.000Z",
      status: "Upcoming",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({
        id: "visit-1",
        dateTime: "2026-05-12T10:15",
        notes: "Mother requested a new time",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.updates).toEqual([
      {
        id: "visit-1",
        data: expect.objectContaining({
          status: "Rescheduled",
          notes: "Mother requested a new time",
          updatedAt: expect.anything(),
        }),
      },
    ]);
    expect(firestoreMock.state.updates[0].data.scheduledAt).toEqual(
      expect.stringMatching(/^2026-05-12T/),
    );
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "Reschedule",
        action: "Rescheduled visit",
        target: "Amara Silva",
      }),
    );
  });

  it("forbids updating visits owned by another midwife", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(midwifeActor);
    midwifeIdentityMock.resolveLinkedMidwifeUids.mockResolvedValueOnce(["midwife-1"]);
    firestoreMock.state.visits.set("visit-1", {
      motherName: "Amara Silva",
      midwifeUid: "midwife-other",
    });

    const response = await PATCH(createPatchRequest({ id: "visit-1", status: "Completed" }));

    await expect(response.json()).resolves.toEqual({ error: "Forbidden." });
    expect(response.status).toBe(403);
    expect(firestoreMock.state.updates).toEqual([]);
  });
});
