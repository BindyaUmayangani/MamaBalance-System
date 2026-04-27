import { describe, expect, it } from "vitest";

import { APP_ROLES, STAFF_ROLES, isStaffRole, roleHomePath } from "./types";

describe("staff auth role helpers", () => {
  it("keeps staff roles separate from mobile-only roles", () => {
    expect(STAFF_ROLES).toEqual([
      "superadmin",
      "regionaladmin",
      "doctor",
      "midwife",
    ]);
    expect(APP_ROLES).toContain("mother");
    expect(isStaffRole("superadmin")).toBe(true);
    expect(isStaffRole("regionaladmin")).toBe(true);
    expect(isStaffRole("doctor")).toBe(true);
    expect(isStaffRole("midwife")).toBe(true);
    expect(isStaffRole("mother")).toBe(false);
  });

  it("maps each staff role to its dashboard home", () => {
    expect(roleHomePath("superadmin")).toBe("/superadmin/dashboard");
    expect(roleHomePath("regionaladmin")).toBe("/regionaladmin/dashboard");
    expect(roleHomePath("doctor")).toBe("/doctor/dashboard");
    expect(roleHomePath("midwife")).toBe("/midwife/dashboard");
  });
});
