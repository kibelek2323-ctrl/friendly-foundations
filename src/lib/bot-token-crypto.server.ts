/**
 * Server-only AES-256-GCM encryption for Discord bot tokens.
 *
 * Uses Web Crypto (available in both the Cloudflare/Nitro server bundle and
 * Node 18+), so the same module works for the control plane and the runtime.
 *
 * SECURITY: never import this at the top level of a route file or a
 * *.functions.ts module — those are bundled for the browser. Import it inside a
 * server handler instead:
 *   const { encryptBotToken } = await import("@/lib/bot-token-crypto.server");
 */

export const BOT_TOKEN_KEY_VERSION = 1;

export interface EncryptedBotToken {
  /** base64 ciphertext, GCM auth tag included */
  ciphertext: string;
  /** base64 12-byte nonce */
  iv: string;
  keyVersion: number;
}

const KEY_BYTES = 32;
const IV_BYTES = 12;

let cachedKey: Promise<CryptoKey> | undefined;

// Returns Uint8Array<ArrayBuffer> (not ArrayBufferLike) so the result is a valid
// BufferSource for Web Crypto under TS 5.7+ typed array generics.
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function importEncryptionKey(): Promise<CryptoKey> {
  const raw = process.env["BOT_TOKEN_ENCRYPTION_KEY"];
  if (!raw) {
    throw new Error(
      "Missing BOT_TOKEN_ENCRYPTION_KEY. Generate one with: " +
        `node -e "console.log(require('node:crypto').randomBytes(${KEY_BYTES}).toString('base64'))"`,
    );
  }

  const keyBytes = base64ToBytes(raw.trim());
  if (keyBytes.length !== KEY_BYTES) {
    throw new Error(
      `BOT_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${keyBytes.length}.`,
    );
  }

  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function getEncryptionKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = importEncryptionKey().catch((error: unknown) => {
      // Never cache a rejected promise: a fixed env var should recover without a restart.
      cachedKey = undefined;
      throw error;
    });
  }
  return cachedKey;
}

export async function encryptBotToken(plaintext: string): Promise<EncryptedBotToken> {
  if (!plaintext) throw new Error("Cannot encrypt an empty bot token.");

  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(sealed)),
    iv: bytesToBase64(iv),
    keyVersion: BOT_TOKEN_KEY_VERSION,
  };
}

export async function decryptBotToken(record: EncryptedBotToken): Promise<string> {
  if (record.keyVersion !== BOT_TOKEN_KEY_VERSION) {
    throw new Error(
      `Bot token was encrypted with key version ${record.keyVersion}, this build only handles ${BOT_TOKEN_KEY_VERSION}.`,
    );
  }

  const key = await getEncryptionKey();
  const opened = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(record.iv) },
    key,
    base64ToBytes(record.ciphertext),
  );

  return new TextDecoder().decode(opened);
}
