export const STAFF_ROLES = [
  "superadmin",
  "regionaladmin",
  "doctor",
  "midwife",
] as const;

export const APP_ROLES = [...STAFF_ROLES, "mother"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type AppRole = (typeof APP_ROLES)[number];

export type UserStatus = "active" | "disabled" | "pending";

export interface UserProfile {
  uid: string;
  role: AppRole;
  status: UserStatus;
  email: string | null;
  personalEmail?: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  username?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function isStaffRole(role: AppRole): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

export function roleHomePath(role: StaffRole) {
  switch (role) {
    case "superadmin":
      return "/superadmin/dashboard";
    case "regionaladmin":
      return "/regionaladmin/dashboard";
    case "doctor":
      return "/doctor/dashboard";
    case "midwife":
      return "/midwife/dashboard";
  }
}
