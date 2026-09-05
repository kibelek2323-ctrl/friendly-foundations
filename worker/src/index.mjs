/**
 * Bottly hosting node worker.
 *
 * Usage:
 *   node src/index.mjs pair BOTTLY-XXXX-XXXX   # one-time pairing, saves worker.config.json
 *   node src/index.mjs start                   # start heartbeating
 *   node src/index.mjs status                  # print saved config + last heartbeat info
 *
 * Config: worker.config.json next to this file (override with BOTTLY_WORKER_CONFIG).
 * Control plane URL: BOTTLY_URL env or config value (default https://bottly.xyz).
 */
import os from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HEARTBEAT_INTERVAL_MS = 20_000;
const REQUEST_TIMEOUT_MS = 15_000;

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.BOTTLY_WORKER_CONFIG ?? path.join(here, "..", "worker.config.json");

function log(level, message) {
  console.log(`[bottly-worker] ${new Date().toISOString()} ${level}: ${message}`);
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    return null;
  }
}

async function writeConfig(config) {
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

/**
 * fetch with a hard timeout. On Windows, aborting mid-flight right before the
 * process exits used to trip a libuv assertion — we always await the request
 * fully (success or failure) and never call process.exit() while I/O is open.
 */
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response
    }
    return { status: response.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function identity() {
  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    dockerVersion: process.env.BOTTLY_DOCKER_VERSION ?? "",
  };
}

function metrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const load = os.loadavg()[0] ?? 0;
  const cpus = os.cpus().length || 1;
  return {
    ...identity(),
    cpuUsage: Math.min(100, Math.max(0, (load / cpus) * 100)),
    memoryUsage: total - free,
    totalMemory: total,
    botCount: Number(process.env.BOTTLY_BOT_COUNT ?? 0) || 0,
  };
}

async function pair(code) {
  const baseUrl = (process.env.BOTTLY_URL ?? "https://bottly.xyz").replace(/\/+$/, "");
  log("info", `Pairing with ${baseUrl} using code ${code} …`);

  const { status, json, text } = await request(`${baseUrl}/api/public/hosting/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, ...identity() }),
  });

  if (!json?.ok) {
    throw new Error(json?.error ?? `Pairing failed (HTTP ${status}): ${text.slice(0, 200)}`);
  }

  await writeConfig({
    baseUrl,
    nodeId: json.nodeId,
    name: json.name,
    token: json.token,
    pairedAt: new Date().toISOString(),
  });

  log("info", `Paired as “${json.name}” (${json.nodeId}). Config saved to ${configPath}`);
  log("info", "Start the worker with: node src/index.mjs start");
}

async function sendHeartbeat(config, event) {
  const { status, json } = await request(`${config.baseUrl}/api/public/hosting/heartbeat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({ event, ...metrics() }),
  });
  return { ok: status === 200 && json?.ok === true, error: json?.error ?? `HTTP ${status}` };
}

async function start() {
  const config = await readConfig();
  if (!config?.token || !config?.baseUrl) {
    log("error", "No config found. Pair first: node src/index.mjs pair BOTTLY-XXXX-XXXX");
    process.exitCode = 1;
    return;
  }

  log("info", `Worker for node “${config.name}” reporting to ${config.baseUrl} every ${HEARTBEAT_INTERVAL_MS / 1000}s.`);

  let stopped = false;
  let timer = null;

  const beat = async () => {
    try {
      const result = await sendHeartbeat(config, "heartbeat");
      if (result.ok) {
        log("info", "Heartbeat ok.");
      } else {
        log("warn", `Heartbeat rejected: ${result.error}`);
      }
    } catch (error) {
      log("warn", `Heartbeat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loop = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      await beat();
      loop();
    }, HEARTBEAT_INTERVAL_MS);
    // Let the process exit naturally if everything else is done.
    timer.unref?.();
  };

  // First heartbeat immediately, then on interval.
  await beat();
  loop();

  // Keep the process alive without an unref'd-only loop.
  const keepAlive = setInterval(() => {}, 60_000);

  const shutdown = async (signal) => {
    if (stopped) return;
    stopped = true;
    log("info", `Received ${signal}, sending disconnect…`);
    if (timer) clearTimeout(timer);
    clearInterval(keepAlive);
    try {
      await sendHeartbeat(config, "disconnect");
    } catch {
      // best effort
    }
    log("info", "Bye.");
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

async function status() {
  const config = await readConfig();
  if (!config) {
    log("info", "No config found — this machine is not paired.");
    return;
  }
  log("info", `Node: ${config.name} (${config.nodeId})`);
  log("info", `Control plane: ${config.baseUrl}`);
  log("info", `Paired at: ${config.pairedAt}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case "pair": {
        const code = args[0]?.trim();
        if (!code) {
          log("error", "Usage: node src/index.mjs pair BOTTLY-XXXX-XXXX");
          process.exitCode = 1;
          return;
        }
        await pair(code);
        return;
      }
      case "start":
        await start();
        return;
      case "status":
        await status();
        return;
      default:
        log("info", "Commands: pair <code> | start | status");
        process.exitCode = command ? 1 : 0;
    }
  } catch (error) {
    // Await is done — safe to report and set exit code without killing
    // in-flight handles (that was the Windows UV_HANDLE_CLOSING crash).
    log("error", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
