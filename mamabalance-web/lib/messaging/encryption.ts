import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "AES-256-GCM";
const keyVersion = "v1";
const defaultDevelopmentKey = "MamaBalance demo message key v1!";

function readKey() {
  const configured = process.env.MESSAGE_ENCRYPTION_KEY;
  const raw = configured
    ? Buffer.from(configured, "base64")
    : Buffer.from(defaultDevelopmentKey, "utf8");

  if (raw.length !== 32) {
    throw new Error("MESSAGE_ENCRYPTION_KEY must be a base64 encoded 32-byte key.");
  }

  return raw;
}

export function encryptMessageText(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm,
    keyVersion,
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptMessageText(data: {
  ciphertext?: unknown;
  iv?: unknown;
  authTag?: unknown;
  text?: unknown;
}) {
  const legacyText = typeof data.text === "string" ? data.text : "";
  const ciphertext = typeof data.ciphertext === "string" ? data.ciphertext : "";
  const iv = typeof data.iv === "string" ? data.iv : "";
  const authTag = typeof data.authTag === "string" ? data.authTag : "";

  if (!ciphertext || !iv || !authTag) {
    return legacyText;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", readKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    return "Unable to decrypt message";
  }
}
