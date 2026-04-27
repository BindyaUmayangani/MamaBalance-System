import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const doctorIdentityMock = vi.hoisted(() => ({
  resolveLinkedDoctorUids: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  logAuditEvent: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    mothers: new Map<string, Record<string, unknown>>(),
    users: new Map<string, Record<string, unknown>>(),
    observations: new Map<string, Record<string, unknown>>(),
    addedObservations: [] as Record<string, unknown>[],
    updates: [] as Array<{ id: string; data: Record<string, unknown> }>,
  };

  const collection = vi.fn((name: string) => {
    if (name === "mothers" || name === "users") {
      const source = name === "mothers" ? state.mothers : state.users;

      return {
        doc: vi.fn((uid: string) => ({
          get: vi.fn(() => {
            const data = source.get(uid) || null;

            return Promise.resolve({
              id: uid,
              exists: Boolean(data),
              data: () => data,
            });
          }),
        })),
      };
    }

    if (name === "careObservations") {
      return {
        add: vi.fn((data: Record<string, unknown>) => {
          state.addedObservations.push(data);
          return Promise.resolve({ id: "observation-new" });
        }),
        doc: vi.fn((id: string) => ({
          get: vi.fn(() => {
            const data = state.observations.get(id) || null;

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

vi.mock("@/lib/doctor/identity", () => ({
  resolveLinkedDoctorUids: doctorIdentityMock.resolveLinkedDoctorUids,
}));

vi.mock("@/lib/audit/log", () => ({
  logAuditEvent: auditMock.logAuditEvent,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firestoreMock.adminDb,
}));

import { PATCH, POST } from "./route";

const doctorActor = {
  uid: "doctor-1",
  role: "doctor",
  status: "active",
  email: "doctor@mamabalance.lk",
  phoneNumber: null,
  displayName: "Dr. Anjali",
  regionId: "colombo",
};

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/doctor/observations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function createPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/doctor/observations", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("POST /api/doctor/observations integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.users = new Map();
    firestoreMock.state.observations = new Map();
    firestoreMock.state.addedObservations = [];
    firestoreMock.state.updates = [];
  });

  it("validates required observation fields", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);

    const response = await POST(createRequest({ motherUid: "mother-1" }));

    await expect(response.json()).resolves.toEqual({ error: "Missing required fields." });
    expect(response.status).toBe(400);
  });

  it("blocks observations for unassigned mothers", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-other",
      fullName: "Amara Silva",
    });

    const response = await POST(
      createRequest({
        motherUid: "mother-1",
        title: "EPDS follow-up",
        note: "Needs review",
        upcomingCheckup: "2026-05-12T09:00",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "You can only add observations for your assigned mothers.",
    });
    expect(response.status).toBe(403);
  });

  it("creates a doctor observation for an assigned mother", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-1",
      fullName: "Amara Silva",
      username: "amara",
      riskLevel: "moderate",
    });
    firestoreMock.state.users.set("doctor-1", { displayName: "Dr. Anjali" });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await POST(
      createRequest({
        motherUid: "mother-1",
        title: "EPDS follow-up",
        note: "Discussed symptoms and support plan",
        mood: "Low",
        sleep: "Poor",
        appetite: "Reduced",
        additional: "Guardian involved",
        upcomingCheckup: "2026-05-12T09:00",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.addedObservations).toEqual([
      expect.objectContaining({
        motherUid: "mother-1",
        motherName: "Amara Silva",
        motherUsername: "amara",
        riskLevel: "Moderate",
        authorRole: "doctor",
        title: "EPDS follow-up",
        note: "Discussed symptoms and support plan",
        doctorId: "doctor-1",
        observedBy: "Dr. Anjali",
        regionId: "colombo",
      }),
    ]);
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "Observations",
        actionType: "Create",
        target: "Amara Silva",
      }),
    );
  });
});

describe("PATCH /api/doctor/observations integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.users = new Map();
    firestoreMock.state.observations = new Map();
    firestoreMock.state.addedObservations = [];
    firestoreMock.state.updates = [];
  });

  it("forbids modifying midwife observations through the doctor endpoint", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.observations.set("obs-1", {
      authorRole: "midwife",
      doctorId: "doctor-1",
    });
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-1",
      fullName: "Amara Silva",
    });

    const response = await PATCH(
      createPatchRequest({
        id: "obs-1",
        motherUid: "mother-1",
        upcomingCheckup: "2026-05-12T09:00",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Cannot modify this observation.",
    });
    expect(response.status).toBe(403);
  });

  it("updates an owned doctor observation", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.observations.set("obs-1", {
      authorRole: "doctor",
      doctorId: "doctor-1",
    });
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-1",
      fullName: "Amara Silva",
      username: "amara",
      riskLevel: "high",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({
        id: "obs-1",
        motherUid: "mother-1",
        title: "Updated review",
        note: "Improved support plan",
        upcomingCheckup: "2026-05-15T11:00",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.updates).toEqual([
      {
        id: "obs-1",
        data: expect.objectContaining({
          motherUid: "mother-1",
          motherName: "Amara Silva",
          motherUsername: "amara",
          riskLevel: "High",
          title: "Updated review",
          note: "Improved support plan",
          updatedAt: expect.anything(),
        }),
      },
    ]);
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "Update",
        action: "Updated doctor observation",
        target: "Amara Silva",
      }),
    );
  });
});
