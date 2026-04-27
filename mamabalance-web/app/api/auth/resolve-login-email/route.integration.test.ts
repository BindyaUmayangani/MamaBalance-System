import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAdminMock = vi.hoisted(() => {
  const get = vi.fn();
  const limit = vi.fn(() => ({ get }));
  const where = vi.fn(() => ({ where, limit }));
  const collection = vi.fn(() => ({ where }));
  const getUser = vi.fn();

  return {
    adminAuth: { getUser },
    adminDb: { collection },
    collection,
    get,
    getUser,
    limit,
    where,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: firebaseAdminMock.adminAuth,
  adminDb: firebaseAdminMock.adminDb,
}));

import { POST } from "./route";

function createRequest(email: unknown) {
  return new NextRequest("http://localhost/api/auth/resolve-login-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

function createSnapshot(
  docs: Array<{ id: string; data: () => Record<string, unknown> }> = [],
) {
  return {
    empty: docs.length === 0,
    docs,
  };
}

describe("POST /api/auth/resolve-login-email integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email submissions before querying Firebase", async () => {
    const response = await POST(createRequest("not-an-email"));

    await expect(response.json()).resolves.toEqual({
      error: "Enter a valid email address.",
    });
    expect(response.status).toBe(400);
    expect(firebaseAdminMock.collection).not.toHaveBeenCalled();
  });

  it("returns the normalized submitted email when no user record exists", async () => {
    firebaseAdminMock.get
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot());

    const response = await POST(createRequest(" Staff.Member@Example.COM "));

    await expect(response.json()).resolves.toEqual({
      loginEmail: "staff.member@example.com",
    });
    expect(response.status).toBe(200);
    expect(firebaseAdminMock.where).toHaveBeenNthCalledWith(
      1,
      "personalEmail",
      "==",
      "staff.member@example.com",
    );
    expect(firebaseAdminMock.where).toHaveBeenNthCalledWith(
      2,
      "email",
      "==",
      "staff.member@example.com",
    );
  });

  it("prefers the Firebase Auth email when a personal email maps to a staff user", async () => {
    firebaseAdminMock.get.mockResolvedValueOnce(
      createSnapshot([
        {
          id: "doctor-123",
          data: () => ({ email: "doctor.system@mamabalance.lk" }),
        },
      ]),
    );
    firebaseAdminMock.getUser.mockResolvedValueOnce({
      email: "Auth.Doctor@MamaBalance.lk",
    });

    const response = await POST(createRequest("doctor.personal@example.com"));

    await expect(response.json()).resolves.toEqual({
      loginEmail: "auth.doctor@mamabalance.lk",
    });
    expect(response.status).toBe(200);
    expect(firebaseAdminMock.getUser).toHaveBeenCalledWith("doctor-123");
  });

  it("falls back to the Firestore email when Auth lookup fails", async () => {
    firebaseAdminMock.get.mockResolvedValueOnce(
      createSnapshot([
        {
          id: "midwife-456",
          data: () => ({ email: "Midwife.System@MamaBalance.lk" }),
        },
      ]),
    );
    firebaseAdminMock.getUser.mockRejectedValueOnce(new Error("Auth unavailable"));

    const response = await POST(createRequest("midwife.personal@example.com"));

    await expect(response.json()).resolves.toEqual({
      loginEmail: "midwife.system@mamabalance.lk",
    });
    expect(response.status).toBe(200);
  });

  it("returns a 500 response when the request cannot be processed", async () => {
    firebaseAdminMock.get.mockRejectedValueOnce(new Error("Firestore unavailable"));

    const response = await POST(createRequest("staff@example.com"));

    await expect(response.json()).resolves.toEqual({ loginEmail: "" });
    expect(response.status).toBe(500);
  });
});
