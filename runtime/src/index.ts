/**
 * Entry point. Boots the HTTP API, then drains gateway connections on shutdown
 * so no bot is left reported as "online" after the process is gone.
 */
import { config } from "./config.js";
import { createRuntimeServer } from "./http.js";
import { logger } from "./logger.js";
import { describeError } from "./redact.js";
import { shutdownAll, startSweeper } from "./supervisor.js";

const SHUTDOWN_TIMEOUT_MS = 15_000;

const server = createRuntimeServer();
const stopSweeper = startSweeper();

let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down.`);

  stopSweeper();
  server.close();

  const timeout = setTimeout(() => {
    logger.error("Shutdown timed out; exiting anyway.");
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  try {
    await shutdownAll();
  } catch (error) {
    logger.error(`Error during shutdown: ${describeError(error)}`);
  }

  clearTimeout(timeout);
  process.exit(exitCode);
}

server.on("error", (error: Error) => {
  logger.error(`HTTP server error: ${describeError(error)}`);
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  logger.info(
    `Bot runtime listening on http://${config.host}:${config.port} ` +
      `(control plane: ${config.controlPlaneUrl}, max bots: ${config.maxConcurrentBots}).`,
  );
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  // Reporting and gateway callbacks are fire-and-forget; log instead of dying.
  logger.error(`Unhandled promise rejection: ${describeError(reason)}`, reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error(`Uncaught exception: ${describeError(error)}`, error);
  void shutdown("uncaughtException", 1);
});