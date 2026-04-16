"use client";

import { useRouter } from "next/navigation";

type Props = {
  active: "doctors" | "midwives" | "mothers";
  role: "superadmin" | "regionaladmin";
};

export default function UserTabs({ active, role }: Props) {
  const router = useRouter();

  const basePath =
    role === "regionaladmin"
      ? "/regionaladmin/user-management"
      : "/superadmin/user-management";

  return (
    <div className="tabs">
      <button
        className={`tab ${active === "doctors" ? "active" : ""}`}
        onClick={() => router.push(`${basePath}/doctors`)}
      >
        Doctors
      </button>

      <button
        className={`tab ${active === "midwives" ? "active" : ""}`}
        onClick={() => router.push(`${basePath}/midwives`)}
      >
        Midwives
      </button>

      <button
        className={`tab ${active === "mothers" ? "active" : ""}`}
        onClick={() => router.push(`${basePath}/mothers`)}
      >
        Mothers
      </button>
    </div>
  );
}