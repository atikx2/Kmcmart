import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Courier credentials sit in the database, so they are encrypted at rest with
 * a key derived from AUTH_SECRET. A database dump on its own is then useless.
 *
 * Format: `v1:<iv b64>:<tag b64>:<ciphertext b64>`. Anything that does not
 * match is treated as plain text, so a value typed straight into the table by
 * hand still works.
 *
 * AUTH_SECRET is optional, exactly as it is for session signing in
 * `admin-auth.ts` — a missing one must never stop an admin from saving their
 * keys. Without it a shared fallback is used, which still beats plaintext but
 * is not deployment-specific; `authSecretIsSet()` lets the panel say so.
 */

const PREFIX = "v1";
const SALT = "kmc-courier-v1";
const FALLBACK = "kmcmartbd-dev-secret";

const cache = new Map<string, Buffer>();

/** False when the deployment has no AUTH_SECRET and the fallback key is in use. */
export function authSecretIsSet(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}

function derive(secret: string): Buffer {
  const hit = cache.get(secret);
  if (hit) return hit;
  const k = scryptSync(secret, SALT, 32);
  cache.set(secret, k);
  return k;
}

function writeKey(): Buffer {
  return derive(process.env.AUTH_SECRET || FALLBACK);
}

/**
 * Both candidates, current one first. Adding AUTH_SECRET to a deployment that
 * already saved keys under the fallback would otherwise wipe them silently —
 * this way the old value still opens and is re-encrypted on the next save.
 */
function readKeys(): Buffer[] {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return [derive(FALLBACK)];
  return [derive(secret), derive(FALLBACK)];
}

export function encryptSecret(plain: string): string {
  const v = plain.trim();
  if (!v) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", writeKey(), iv);
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
  for (const k of readKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(parts[1], "base64"));
      decipher.setAuthTag(Buffer.from(parts[2], "base64"));
      return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8");
    } catch {
      /* try the next candidate */
    }
  }
  /* Corrupted row, or AUTH_SECRET was changed to a third value. Behave as "no
     key saved" so the panel asks for the credentials again instead of 500ing. */
  return "";
}
