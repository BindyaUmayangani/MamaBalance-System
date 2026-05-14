import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const doctorIdentityMock = vi.hoisted(() => ({
  resolveLinkedDoctorUids: vi.fn(),
}));

const firestoreMock = vi.hoisted(() => {
  const state = {
    mothers: new Map<string, Record<string, unknown>>(),
    transactionSets: [] as Array<{
      path: string;
      data: Record<string, unknown>;
      options?: Record<string, unknown>;
    }>,
    documentSets: [] as Array<{
      path: string;
      data: Record<string, unknown>;
      options?: Record<string, unknown>;
    }>,
  };

  function ref(path: string) {
    return {
      path,
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id = "message-new") => ref(`${path}/${name}/${id}`)),
      })),
      doc: vi.fn((id = "generated") => ref(`${path}/${id}`)),
      get: vi.fn(() => {
        const motherId = path.split("/").at(-1) || "";
        const data = state.mothers.get(motherId) || null;

        return Promise.resolve({
          id: motherId,
          exists: Boolean(data),
          data: () => data,
        });
      }),
      set: vi.fn(
        (
          data: Record<string, unknown>,
          options?: Record<string, unknown>,
        ) => {
          state.documentSets.push({ path, data, options });
          return Promise.resolve();
        },
      ),
    };
  }

  const collection = vi.fn((name: string) => ({
    doc: vi.fn((id: string) => ref(`${name}/${id}`)),
  }));

  const runTransaction = vi.fn(
    async (
      callback: (transaction: {
        set: (
          reference: { path: string },
          data: Record<string, unknown>,
          options?: Record<string, unknown>,
        ) => void;
      }) => Promise<void>,
    ) => {
      await callback({
        set: (reference, data, options) => {
          state.transactionSets.push({ path: reference.path, data, options });
        },
      });
    },
  );

  return {
    adminDb: { collection, runTransaction },
    collection,
    runTransaction,
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

import { POST } from "./route";

const doctorActor = {
  uid: "doctor-1",
  role: "doctor",
  status: "active",
  email: "doctor@mamabalance.lk",
  phoneNumber: null,
  displayName: "Dr. Anjali",
};

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/doctor/messaging", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/doctor/messaging integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.state.mothers = new Map();
    firestoreMock.state.transactionSets = [];
    firestoreMock.state.documentSets = [];
  });

  it("validates message target and text", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);

    const response = await POST(createRequest({ motherUid: "mother-1", text: "   " }));

    await expect(response.json()).resolves.toEqual({
      error: "Mother and message are required.",
    });
    expect(response.status).toBe(400);
  });

  it("blocks messages to unassigned mothers", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-other",
    });

    const response = await POST(
      createRequest({ motherUid: "mother-1", text: "Please attend the clinic." }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "You can only message assigned mothers.",
    });
    expect(response.status).toBe(403);
    expect(firestoreMock.state.documentSets).toHaveLength(1);
    expect(firestoreMock.state.documentSets[0]).toEqual(
      expect.objectContaining({
        path: "users/doctor-1",
        options: { merge: true },
      }),
    );
  });

  it("stores doctor messages through a transaction with encrypted text", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(doctorActor);
    doctorIdentityMock.resolveLinkedDoctorUids.mockResolvedValueOnce(["doctor-1"]);
    firestoreMock.state.mothers.set("mother-1", {
      assignedDoctorUid: "doctor-1",
    });

    const response = await POST(
      createRequest({ motherUid: "mother-1", text: "Please attend the clinic." }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      conversationId: "mother-1_doctor_doctor-1",
    });
    expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);
    expect(firestoreMock.state.transactionSets).toHaveLength(2);
    expect(firestoreMock.state.transactionSets[0]).toEqual(
      expect.objectContaining({
        path: "conversations/mother-1_doctor_doctor-1",
        data: expect.objectContaining({
          motherUid: "mother-1",
          doctorUid: "doctor-1",
          lastMessageText: "Secure message",
          lastMessageSenderUid: "doctor-1",
        }),
        options: { merge: true },
      }),
    );
    expect(firestoreMock.state.transactionSets[1]).toEqual(
      expect.objectContaining({
        path: "conversations/mother-1_doctor_doctor-1/messages/message-new",
        data: expect.objectContaining({
          senderUid: "doctor-1",
          senderRole: "doctor",
          algorithm: "AES-256-GCM",
          readBy: ["doctor-1"],
        }),
      }),
    );
    expect(firestoreMock.state.transactionSets[1].data).not.toHaveProperty("text");
    expect(String(firestoreMock.state.transactionSets[1].data.ciphertext)).not.toContain(
      "Please attend the clinic.",
    );
  });
});
