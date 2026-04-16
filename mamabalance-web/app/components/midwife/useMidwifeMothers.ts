"use client";

import { useCallback, useEffect, useState } from "react";

import {
  MidwifeDoctorOption,
  MidwifeMotherRecord,
} from "@/lib/midwife/types";

type Scope = "assigned" | "high-risk";

export function useMidwifeMothers(scope: Scope) {
  const [mothers, setMothers] = useState<MidwifeMotherRecord[]>([]);
  const [doctors, setDoctors] = useState<MidwifeDoctorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/midwife/mothers?scope=${scope}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        mothers?: MidwifeMotherRecord[];
        doctors?: MidwifeDoctorOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load mothers.");
      }

      setMothers(payload.mothers || []);
      setDoctors(payload.doctors || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load mothers.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  const assignDoctor = useCallback(
    async (motherUid: string, doctorUid: string) => {
      const response = await fetch("/api/midwife/mothers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motherUid,
          doctorUid,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to assign doctor.");
      }

      await reload();
    },
    [reload],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    mothers,
    doctors,
    isLoading,
    error,
    reload,
    assignDoctor,
  };
}
