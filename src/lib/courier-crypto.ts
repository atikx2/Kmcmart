import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Courier credentials sit in the database, so they are encrypted at rest with
 * a key derived from AUTH_SECRET. A database dump on its own is then useless.
 *
 * Format: `v1:<iv b64>:<tag b64>:<ciphertext b64>`. Anything that does not
 * match is treated as plain text, so a value typed straight into the table by
 * hand still works.
 */

const PREFIX = "v1";
const SALT = "kmc-courier-v1";

let cached: Buffer | null = null;

function key(): Buffer {
  if (cached) return cached;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — courier keys cannot be encrypted");
  cached = scryptSync(secret, SALT, 32);
  return cached;
}

export function encryptSecret(plain: string): string {
  const v = plain.trim();
  if (!v) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(v, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const v = (stored ?? "").trim();
  if (!v) return "";
  const parts = v.split(":");
  /* Not our format — assume somebody pasted the raw key into the row. */
  if (parts.length !== 4 || parts[0] !== PREFIX) return v;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(parts[1], "base64"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8");
  } catch {
    /* Wrong AUTH_SECRET, or a corrupted row. Behave as "no key saved" so the
       panel asks for the credentials again instead of 500ing. */
    return "";
  }
}
