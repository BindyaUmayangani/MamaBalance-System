import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServerMock = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
}));

const firebaseAdminMock = vi.hoisted(() => {
  const get = vi.fn();
  const update = vi.fn();
  const doc = vi.fn(() => ({ get, update }));
  const collection = vi.fn(() => ({ doc }));

  return {
    adminDb: { collection },
    collection,
    doc,
    get,
    update,
  };
});

vi.mock("@/lib/auth/server", () => ({
  getCurrentSessionUser: authServerMock.getCurrentSessionUser,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: firebaseAdminMock.adminDb,
}));

import { GET, PATCH } from "./route";

function createPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const activeRegionalAdmin = {
  uid: "regional-1",
  role: "regionaladmin",
  status: "active",
  email: "regional@mamabalance.lk",
  phoneNumber: null,
  displayName: "Regional Admin",
  regionId: "colombo",
};

describe("GET /api/auth/me integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no staff session exists", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(null);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ user: null });
    expect(response.status).toBe(401);
    expect(firebaseAdminMock.collection).not.toHaveBeenCalled();
  });

  it("returns the current user and resolves region name", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(activeRegionalAdmin);
    firebaseAdminMock.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ name: "Colombo District" }),
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      user: {
        ...activeRegionalAdmin,
        regionName: "Colombo District",
      },
    });
    expect(response.status).toBe(200);
    expect(firebaseAdminMock.collection).toHaveBeenCalledWith("regions");
    expect(firebaseAdminMock.doc).toHaveBeenCalledWith("colombo");
  });

  it("falls back to null region name when user has no region", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce({
      ...activeRegionalAdmin,
      regionId: null,
    });

    const response = await GET();

    const payload = await response.json();
    expect(payload.user.regionName).toBeNull();
    expect(firebaseAdminMock.collection).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/auth/me integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects profile updates without a staff session", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(null);

    const response = await PATCH(createPatchRequest({ profileImage: "profile.png" }));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
    expect(firebaseAdminMock.update).not.toHaveBeenCalled();
  });

  it("updates profile media for the current staff user", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(activeRegionalAdmin);
    firebaseAdminMock.update.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      createPatchRequest({
        profileImage: "profile.png",
        coverImage: "cover.png",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(firebaseAdminMock.collection).toHaveBeenCalledWith("users");
    expect(firebaseAdminMock.doc).toHaveBeenCalledWith("regional-1");
    expect(firebaseAdminMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        profileImage: "profile.png",
        coverImage: "cover.png",
        updatedAt: expect.anything(),
      }),
    );
  });

  it("returns a validation-style error when Firestore update fails", async () => {
    authServerMock.getCurrentSessionUser.mockResolvedValueOnce(activeRegionalAdmin);
    firebaseAdminMock.update.mockRejectedValueOnce(new Error("Storage URL rejected"));

    const response = await PATCH(createPatchRequest({ profileImage: "profile.png" }));

    await expect(response.json()).resolves.toEqual({ error: "Storage URL rejected" });
    expect(response.status).toBe(400);
  });
});
