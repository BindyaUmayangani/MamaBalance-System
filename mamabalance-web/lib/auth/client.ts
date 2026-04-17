"use client";

type SessionUserResponse = {
  user?: {
    uid: string;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
    personalEmail?: string | null;
    role?: string | null;
    regionName?: string | null;
    profileImage?: string | null;
    phoneNumber?: string | null;
  } | null;
};

let currentUserRequest: Promise<SessionUserResponse> | null = null;

export function clearCurrentUserClientCache() {
  currentUserRequest = null;
}

export async function getCurrentUserClient(
  options: { forceRefresh?: boolean } = {},
) {
  if (options.forceRefresh) {
    clearCurrentUserClientCache();
  }

  if (!currentUserRequest) {
    currentUserRequest = fetch("/api/auth/me", { cache: "no-store" }).then(
      async (response) => {
        const payload = (await response.json()) as SessionUserResponse;

        if (!response.ok) {
          throw new Error("Unable to load session user.");
        }

        return payload;
      },
    );
  }

  try {
    return await currentUserRequest;
  } catch (error) {
    clearCurrentUserClientCache();
    throw error;
  }
}
