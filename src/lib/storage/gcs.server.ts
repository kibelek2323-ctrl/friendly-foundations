/**
 * Bottly Storage Service — Google Cloud Storage driver.
 *
 * The whole app talks to storage through this module only, so the underlying
 * bucket provider can be swapped (S3/R2) without touching the Code Editor.
 * Credentials live in backend secrets and never reach the browser.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface StorageObject {
  path: string;
  size: number;
  contentType: string;
  updatedAt: string;
}

function config(): { bucket: string; account: ServiceAccount } {
  const bucket = process.env["GCS_BUCKET"];
  const raw = process.env["GCS_SERVICE_ACCOUNT_JSON"];
  if (!bucket || !raw) {
    throw new Error("Storage is not configured. Add GCS_BUCKET and GCS_SERVICE_ACCOUNT_JSON.");
  }
  let account: ServiceAccount;
  try {
    account = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  if (!account.client_email || !account.private_key) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
  }
  return { bucket, account };
}

function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  const data =
    typeof bytes === "string"
      ? new TextEncoder().encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

/** OAuth2 access token for the service account (cached until shortly before expiry). */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const { account } = config();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/devstorage.read_write",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key.replace(/\\n/g, "\n")) as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`) as unknown as ArrayBuffer,
  );
  const assertion = `${header}.${claim}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Storage auth failed (${res.status}).`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function authHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await accessToken()}` };
}

/** Reject traversal and absolute paths; every path stays inside the caller's prefix. */
export function normalizePath(input: string): string {
  const cleaned = input.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  const parts = cleaned.split("/").filter((p) => p.length > 0 && p !== "." && p !== "..");
  const path = parts.join("/");
  if (!path) throw new Error("Invalid file path.");
  if (path.length > 512) throw new Error("File path is too long.");
  return path;
}

function objectUrl(bucket: string, key: string, suffix = ""): string {
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key)}${suffix}`;
}

export async function uploadFile(key: string, body: string | Uint8Array, contentType = "text/plain"): Promise<void> {
  const { bucket } = config();
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": contentType },
    body: typeof body === "string" ? body : (body as unknown as BodyInit),
  });
  if (!res.ok) throw new Error(`Could not save file (${res.status}).`);
}

export async function downloadFile(key: string): Promise<string> {
  const { bucket } = config();
  const res = await fetch(objectUrl(bucket, key, "?alt=media"), { headers: await authHeaders() });
  if (res.status === 404) throw new Error("File not found.");
  if (!res.ok) throw new Error(`Could not read file (${res.status}).`);
  return res.text();
}

export async function getFile(key: string): Promise<StorageObject | null> {
  const { bucket } = config();
  const res = await fetch(objectUrl(bucket, key), { headers: await authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not read file info (${res.status}).`);
  const json = (await res.json()) as { name: string; size?: string; contentType?: string; updated?: string };
  return {
    path: json.name,
    size: Number(json.size ?? 0),
    contentType: json.contentType ?? "application/octet-stream",
    updatedAt: json.updated ?? new Date().toISOString(),
  };
}

export async function deleteFile(key: string): Promise<void> {
  const { bucket } = config();
  const res = await fetch(objectUrl(bucket, key), { method: "DELETE", headers: await authHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`Could not delete file (${res.status}).`);
}

export async function listFiles(prefix: string): Promise<StorageObject[]> {
  const { bucket } = config();
  const out: StorageObject[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ prefix, maxResults: "1000" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params.toString()}`,
      { headers: await authHeaders() },
    );
    if (!res.ok) throw new Error(`Could not list files (${res.status}).`);
    const json = (await res.json()) as {
      items?: Array<{ name: string; size?: string; contentType?: string; updated?: string }>;
      nextPageToken?: string;
    };
    for (const item of json.items ?? []) {
      out.push({
        path: item.name,
        size: Number(item.size ?? 0),
        contentType: item.contentType ?? "application/octet-stream",
        updatedAt: item.updated ?? new Date().toISOString(),
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

export async function copyFile(from: string, to: string): Promise<void> {
  const { bucket } = config();
  const b = encodeURIComponent(bucket);
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${b}/o/${encodeURIComponent(from)}/copyTo/b/${b}/o/${encodeURIComponent(to)}`,
    { method: "POST", headers: { ...(await authHeaders()), "Content-Length": "0" } },
  );
  if (!res.ok) throw new Error(`Could not copy file (${res.status}).`);
}

export async function moveFile(from: string, to: string): Promise<void> {
  await copyFile(from, to);
  await deleteFile(from);
}

/** Rename is a move within the same parent folder. */
export async function renameFile(from: string, to: string): Promise<void> {
  await moveFile(from, to);
}

/** GCS has no real folders; a zero-byte marker keeps empty folders visible. */
export async function createFolder(prefix: string): Promise<void> {
  await uploadFile(`${prefix.replace(/\/+$/, "")}/.keep`, "", "text/plain");
}

/** True when backend storage credentials are present. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env["GCS_BUCKET"] && process.env["GCS_SERVICE_ACCOUNT_JSON"]);
}
