import { describe, expect, it, vi } from "vitest";

import {
  buildRoleUserId,
  buildSystemEmail,
  buildSystemUsername,
  buildTemporaryPassword,
  buildUserCode,
  formatDate,
  slugifyName,
} from "./format";

describe("staff user formatting helpers", () => {
  it("formats valid dates and falls back for empty or invalid values", () => {
    expect(formatDate("2026-04-27T15:30:00.000Z")).toBe("2026-04-27");
    expect(formatDate(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01-05");
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatDate(null)).toBe("-");
  });

  it("creates safe slugs and role-based identities", () => {
    expect(slugifyName("  Dr. Anjali Perera  ")).toBe("dr.anjali.perera");
    expect(slugifyName("!!!")).toBe("user");
    expect(buildUserCode("DOC-", "abc123xyz")).toBe("DOC-ABC123");
    expect(buildRoleUserId("midwife", "mw567890")).toBe("MIDWIFE-MW5678");
    expect(buildSystemUsername("Nimali Silva", "doctor")).toBe("nimali.silva.doctor");
  });

  it("uses a timestamped internal email for staff login identities", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_777_777_123_456);

    expect(buildSystemEmail("Regional Lead", "regionaladmin")).toBe(
      "regional.lead.admin.123456@mamabalance.lk",
    );
  });

  it("builds predictable temporary passwords from sanitized staff names", () => {
    expect(buildTemporaryPassword("  anjali perera  ", "doctor")).toBe("AnjaliDoctor@123");
    expect(buildTemporaryPassword("@@@", "midwife")).toBe("UserMidwife@123");
    expect(buildTemporaryPassword("LongFirstNameBeyondLimit Silva", "regionaladmin")).toBe(
      "LongFirstNamAdmin@123",
    );
  });
});
