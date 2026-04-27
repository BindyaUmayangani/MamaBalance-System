import { afterEach, describe, expect, it } from "vitest";

import { decryptMessageText, encryptMessageText } from "./encryption";

describe("staff messaging encryption", () => {
  afterEach(() => {
    delete process.env.MESSAGE_ENCRYPTION_KEY;
  });

  it("round-trips message text without storing plaintext", () => {
    const encrypted = encryptMessageText("Patient update for clinic review");

    expect(encrypted.algorithm).toBe("AES-256-GCM");
    expect(encrypted.keyVersion).toBe("v1");
    expect(encrypted.ciphertext).not.toContain("Patient update");
    expect(decryptMessageText(encrypted)).toBe("Patient update for clinic review");
  });

  it("returns legacy text when encrypted fields are absent", () => {
    expect(decryptMessageText({ text: "Older message format" })).toBe("Older message format");
  });

  it("returns a safe error message for tampered encrypted payloads", () => {
    const encrypted = encryptMessageText("Confidential staff note");

    expect(
      decryptMessageText({
        ...encrypted,
        authTag: Buffer.from("tampered-auth-tag").toString("base64"),
      }),
    ).toBe("Unable to decrypt message");
  });

  it("rejects incorrectly sized configured encryption keys", () => {
    process.env.MESSAGE_ENCRYPTION_KEY = Buffer.from("short-key").toString("base64");

    expect(() => encryptMessageText("hello")).toThrow(
      "MESSAGE_ENCRYPTION_KEY must be a base64 encoded 32-byte key.",
    );
  });
});
