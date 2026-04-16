"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ManagedMotherRow,
  ManagedRole,
  ManagedUserRow,
  RegionOption,
} from "@/lib/admin/types";

export function useManagedUsers<T extends ManagedUserRow | ManagedMotherRow>(
  role: ManagedRole,
) {
  const [users, setUsers] = useState<T[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users?role=${role}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        users?: T[];
        regions?: RegionOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load users.");
      }

      setUsers(payload.users || []);
      setRegions(payload.regions || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    users,
    setUsers,
    regions,
    isLoading,
    error,
    reload,
  };
}
