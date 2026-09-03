/**
 * AES-256-GCM decryption for stored bot tokens.
 *
 * Mirror of src/lib/bot-token-crypto.server.ts in the web app: the control
 * plane encrypts, the runtime decrypts, and BOT_TOKEN_ENCRYPTION_KEY must be
 * byte-identical in both environments. Plaintext tokens exist only inside this
 * process, only long enough to call client.login().
 */
import { webcrypto } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;

/** Key version this build understands. Bump in lockstep with the web app. */
export const BOT_TOKEN_KEY_VERSION = 1;

type AesKey = Awaited<ReturnType<typeof webcrypto.subtle.importKey>>;

let cachedKey: Promise<AesKey> | undefined;

/** Returns an ArrayBuffer-backed view, required by Web Crypto's BufferSource. */
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = Buffer.from(value.trim(), "base64");
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return bytes;
}

function importEncryptionKey(): Promise<AesKey> {
  const raw = process.env["BOT_TOKEN_ENCRYPTION_KEY"];
  if (!raw) {
    throw new Error(
      "Missing BOT_TOKEN_ENCRYPTION_KEY. It must match the value used by the web app.",
    );
  }

  const keyBytes = base64ToBytes(raw);
  if (keyBytes.length !== KEY_BYTES) {
    throw new Error(
      `BOT_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${keyBytes.length}.`,
    );
  }

  return webcrypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
}

function getEncryptionKey(): Promise<AesKey> {
  if (!cachedKey) {
    cachedKey = importEncryptionKey().catch((error: unknown) => {
      // Never cache a rejection: fixing the env var should recover on next use.
      cachedKey = undefined;
      throw error;
    });
  }
  return cachedKey;
}

export async function decryptBotToken(record: {
  ciphertext: string;
  iv: string;
  keyVersion: number;
}): Promise<string> {
  if (record.keyVersion !== BOT_TOKEN_KEY_VERSION) {
    throw new Error(
      `Token was encrypted with key version ${record.keyVersion}, this runtime only handles ${BOT_TOKEN_KEY_VERSION}.`,
    );
  }

  const iv = base64ToBytes(record.iv);
  if (iv.length !== IV_BYTES) {
    throw new Error(`Token nonce must decode to ${IV_BYTES} bytes, got ${iv.length}.`);
  }

  const key = await getEncryptionKey();
  const opened = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBytes(record.ciphertext),
  );

  const token = new TextDecoder().decode(opened);
  if (!token) throw new Error("Decrypted token is empty.");
  return token;
}

/** True when the failure is a bad key / tampered ciphertext rather than config. */
export function isDecryptionFailure(error: unknown): boolean {
  return error instanceof Error && /operation|decrypt|tag/i.test(error.message);
}