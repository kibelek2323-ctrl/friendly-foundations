# Bottly Worker

Lightweight hosting-node worker for Bottly. It pairs with the control plane and sends heartbeats with machine metrics (hostname, platform, CPU, RAM, bot count).

Requires Node.js 18.17+ (uses global `fetch`). No dependencies.

## Setup

1. In the Bottly admin panel, go to **Admin → Hosting** and click **Add hosting node**. Copy the one-time pairing code.
2. On the machine:

```bash
node src/index.mjs pair BOTTLY-XXXX-XXXX
node src/index.mjs start
```

The pairing command saves `worker.config.json` (node id, token, control-plane URL) next to the worker. Keep it secret — the token authenticates the node.

## Commands

| Command | Description |
| --- | --- |
| `node src/index.mjs pair <code>` | Pair this machine (one-time) |
| `node src/index.mjs start` | Start heartbeating every 20s |
| `node src/index.mjs status` | Show saved pairing info |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `BOTTLY_URL` | `https://bottly.xyz` | Control plane URL |
| `BOTTLY_WORKER_CONFIG` | `worker.config.json` | Config file path |
| `BOTTLY_BOT_COUNT` | `0` | Number of bots reported in heartbeats |
| `BOTTLY_DOCKER_VERSION` | — | Docker version string reported on pairing |

On `Ctrl+C` / `SIGTERM` the worker sends a `disconnect` event so the node shows offline immediately.
