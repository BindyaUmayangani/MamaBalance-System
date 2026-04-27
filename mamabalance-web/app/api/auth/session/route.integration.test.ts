import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";

const firebaseAdminMock = vi.hoisted(() => {
  const docGet = vi.fn();
  const doc = vi.fn(() => ({ get: docGet }));
  const collection = vi.fn(() => ({ doc }));
  const verifyIdToken = vi.fn();
  const createSessionCookie = vi.fn();

  return {
    adminAuth: { createSessionCookie, verifyIdToken },
    adminDb: { collection },
    collection,
    createSessionCookie,
    doc,
    docGet,
    verifyIdToken,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: firebaseAdminMock.adminAuth,
  adminDb: firebaseAdminMock.adminDb,
}));

import { DELETE, POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/session", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function createUserSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data,
  };
}

describe("POST /api/auth/session integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing ID tokens", async () => {
    const response = await POST(createRequest({}));

    await expect(response.json()).resolves.toEqual({ error: "Missing ID token." });
    expect(response.status).toBe(400);
    expect(firebaseAdminMock.verifyIdToken).not.toHaveBeenCalled();
  });

  it("creates a secure staff session and returns the role dashboard path", async () => {
    firebaseAdminMock.verifyIdToken.mockResolvedValueOnce({ uid: "doctor-1" });
    firebaseAdminMock.docGet.mockResolvedValueOnce(
      createUserSnapshot({ role: "doctor", status: "active" }),
    );
    firebaseAdminMock.createSessionCookie.mockResolvedValueOnce("session-cookie");

    const response = await POST(createRequest({ idToken: "id-token" }));

    await expect(response.json()).resolves.toEqual({
      redirectPath: "/doctor/dashboard",
      role: "doctor",
    });
    expect(response.status).toBe(200);
    expect(firebaseAdminMock.verifyIdToken).toHaveBeenCalledWith("id-token");
    expect(firebaseAdminMock.createSessionCookie).toHaveBeenCalledWith("id-token", {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("session-cookie");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.httpOnly).toBe(true);
  });

  it("blocks inactive or mobile-only accounts from staff sessions", async () => {
    firebaseAdminMock.verifyIdToken.mockResolvedValueOnce({ uid: "mother-1" });
    firebaseAdminMock.docGet.mockResolvedValueOnce(
      createUserSnapshot({ role: "mother", status: "active" }),
    );

    const response = await POST(createRequest({ idToken: "id-token" }));

    await expect(response.json()).resolves.toEqual({
      error: "This account is not an active staff account.",
    });
    expect(response.status).toBe(403);
    expect(firebaseAdminMock.createSessionCookie).not.toHaveBeenCalled();
  });

  it("returns unauthorized when Firebase token verification fails", async () => {
    firebaseAdminMock.verifyIdToken.mockRejectedValueOnce(new Error("bad token"));

    const response = await POST(createRequest({ idToken: "bad-token" }));

    await expect(response.json()).resolves.toEqual({
      error: "Unable to create the secure session.",
    });
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/auth/session integration", () => {
  it("clears the staff session cookie", async () => {
    const response = await DELETE();

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge).toBe(0);
  });
});
