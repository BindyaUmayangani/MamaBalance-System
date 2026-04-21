export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
}

export function slugifyName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return normalized || "user";
}

export function buildUserCode(prefix: string, uid: string) {
  return `${prefix}${uid.slice(0, 6).toUpperCase()}`;
}

export function buildRoleUserId(
  role: "regionaladmin" | "doctor" | "midwife" | "mother" | "guardian",
  uid: string,
) {
  const prefixes = {
    regionaladmin: "ADMIN",
    doctor: "DOCTOR",
    midwife: "MIDWIFE",
    mother: "MOTHER",
    guardian: "GUARDIAN",
  } as const;

  return `${prefixes[role]}-${uid.slice(0, 6).toUpperCase()}`;
}

export function buildSystemUsername(
  fullName: string,
  role: "regionaladmin" | "doctor" | "midwife" | "mother" | "guardian",
) {
  const suffixes = {
    regionaladmin: "admin",
    doctor: "doctor",
    midwife: "midwife",
    mother: "mother",
    guardian: "guardian",
  } as const;

  return `${slugifyName(fullName)}.${suffixes[role]}`;
}

export function buildSystemEmail(
  fullName: string,
  role: "regionaladmin" | "doctor" | "midwife" | "mother" | "guardian",
) {
  const stamp = Date.now().toString().slice(-6);
  return `${buildSystemUsername(fullName, role)}.${stamp}@mamabalance.lk`;
}

export function buildTemporaryPassword(
  fullName: string,
  role: "regionaladmin" | "doctor" | "midwife" | "mother" | "guardian",
) {
  const firstName =
    fullName
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 12) || "User";

  const roleLabel = {
    regionaladmin: "Admin",
    doctor: "Doctor",
    midwife: "Midwife",
    mother: "Mother",
    guardian: "Guardian",
  }[role];

  const normalizedFirstName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return `${normalizedFirstName}${roleLabel}@123`;
}
