import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  logAuditEvent: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    medications: new Map<string, Record<string, unknown>>(),
    updates: [] as Array<{ id: string; data: Record<string, unknown> }>,
  };

  const collection = vi.fn((name: string) => {
    if (name !== "careMedications") {
      return {
        where: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
        })),
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({ exists: false })),
        })),
        get: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
      };
    }

    return {
      doc: vi.fn((id: string) => ({
        get: vi.fn(() => {
          const data = state.medications.get(id) || null;

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
  });

  return {
    adminDb: {
      batch: vi.fn(() => ({
        commit: vi.fn(() => Promise.resolve()),
        set: vi.fn(),
      })),
      collection,
    },
    collection,
    state,
  };
});

vi.mock("@/lib/auth/server", () => ({
  getCurrentSessionUser: authServerMock.getCurrentSessionUser,
}));

vi.mock("@/lib/audit/log", () => ({
  logAuditEvent: auditMock.logAuditEvent,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firestoreMock.adminDb,
}));

import { PATCH } from "./route";

const doctorActor = {
  uid: "doctor-1",
  role: "doctor",
  status: "active",
  email: "doctor@mamabalance.lk",
  phoneNumber: null,
  displayName: "Dr. Anjali",
};

function createPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/doctor/medications", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/doctor/medications integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.medications = new Map();
    firestoreMock.state.updates = [];
  });

  it("rejects medication mutations from non-doctor staff", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce({
      ...doctorActor,
      role: "midwife",
    });

    const response = await PATCH(createPatchRequest({ medicationId: "med-1" }));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
  });

  it("validates medication id", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);

    const response = await PATCH(createPatchRequest({ action: "STOP" }));

    await expect(response.json()).resolves.toEqual({
      error: "Medication ID is required.",
    });
    expect(response.status).toBe(400);
  });

  it("updates medication details and writes an audit event", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    firestoreMock.state.medications.set("med-1", {
      motherUid: "mother-1",
      medicationName: "Old Medicine",
      dosage: "10",
      frequency: "Daily",
      duration: "7 days",
      notes: "Old notes",
      instructions: "Old instructions",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({
        medicationId: "med-1",
        medicationName: "New Medicine",
        dosage: "20",
        frequency: "Twice daily",
        endDate: "2026-05-10",
        notes: "Updated notes",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.updates).toEqual([
      {
        id: "med-1",
        data: expect.objectContaining({
          medicationName: "New Medicine",
          dosage: "20",
          frequency: "Twice daily",
          notes: "Updated notes",
          instructions: "Old instructions",
          updatedAt: expect.anything(),
        }),
      },
    ]);
    expect(firestoreMock.state.updates[0].data.endDate).toBeInstanceOf(Date);
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: doctorActor,
        module: "Medication",
        actionType: "Update",
        action: "Updated medication details",
        target: "mother-1",
        metadata: { medicationId: "med-1" },
      }),
    );
  });

  it("stops medication with a reason and audit entry", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    firestoreMock.state.medications.set("med-1", {
      motherUid: "mother-1",
      medicationName: "Sertraline",
    });
    auditMock.logAuditEvent.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({
        medicationId: "med-1",
        action: "STOP",
        reasonStopped: "Side effects reported",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firestoreMock.state.updates).toEqual([
      {
        id: "med-1",
        data: expect.objectContaining({
          status: "Stopped",
          reasonStopped: "Side effects reported",
          updatedAt: expect.anything(),
        }),
      },
    ]);
    expect(firestoreMock.state.updates[0].data.endDate).toBeInstanceOf(Date);
    expect(auditMock.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Stopped medication",
        metadata: {
          medicationId: "med-1",
          reason: "Side effects reported",
        },
      }),
    );
  });
});
