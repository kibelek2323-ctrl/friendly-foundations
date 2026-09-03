# Bottly bot runtime

Long-lived Node service that owns the Discord gateway connections. The web app is
only its **control plane**: it stores encrypted tokens, sends start/stop commands,
and renders whatever this service reports back.

    browser ──► server functions (Supabase JWT)
                 └─► POST /v1/bots/:botId/start     ──► runtime ──► Discord gateway
    runtime ──► GET  /api/internal/bots/:botId/token     (encrypted token)
    runtime ──► POST /api/internal/runtime/events        (state + activity)

The browser never talks to this service and never sees a bot token.

## HTTP API

All `/v1/*` routes require `Authorization: Bearer $BOT_RUNTIME_SHARED_SECRET`.

| Method | Path | Body / query | Response |
| ------ | ---- | ------------ | -------- |
| `POST` | `/v1/bots/:botId/start` | `{ botId, userId }` | `RuntimeStatusPayload` |
| `POST` | `/v1/bots/:botId/stop` | `{ botId, userId }` | `RuntimeStatusPayload` |
| `GET` | `/v1/bots/:botId` | `?userId=<uuid>` | `RuntimeStatusPayload` |
| `GET` | `/healthz` | — | `{ ok: true }` (+ counts when authenticated) |

`RuntimeStatusPayload` is `{ state, startedAt, lastError, guildCount, username }`
with `state` one of `offline | starting | online | stopping | error`, matching
`runtimeStatusSchema` in `src/lib/runtime-client.server.ts`.

`start` returns as soon as Discord accepts the IDENTIFY, so the usual response is
`starting`; the flip to `online` (or `error`) arrives at the control plane through
the events callback, which is what the dashboard polls for.

## Setup

    cd runtime
    cp .env.example .env    # fill in the three secrets + CONTROL_PLANE_URL
    npm install
    npm run build
    npm start

`BOT_TOKEN_ENCRYPTION_KEY`, `BOT_RUNTIME_SHARED_SECRET` and
`BOT_RUNTIME_CALLBACK_SECRET` must be byte-identical to the web app's values.
A mismatched encryption key surfaces as "The stored token could not be decrypted".

## Behaviour worth knowing

- **State is reported, not guessed.** Ready, resume, reconnect, fatal close and
  login failure each push a state change plus a `bot_runtime_events` row, so the
  dashboard shows `Error` with a reason instead of a fake `Online`.
- **Commands are serialised per bot**, so a double-clicked Start or a Stop landing
  mid-start cannot interleave.
- **Restarts drop connections.** On `SIGTERM`/`SIGINT` every bot is disconnected
  and reported `offline` with a `runtime.shutdown` event; owners must start them
  again. Add persistence/auto-resume here if you want survive-restart behaviour.
- **Token plaintext is transient**: fetched encrypted, decrypted in memory, handed
  to `client.login()`, then dropped. Error text is scrubbed of anything
  token-shaped before it is logged or reported.
- **Intents**: `Guilds` + `GuildMessages` by default. Privileged intents need both
  the developer-portal toggle and `DISCORD_EXTRA_INTENTS`.

## Security

`/v1/*` has no user session behind it — the shared secret is the entire perimeter.
Bind it to a private network or put an authenticating proxy in front, never expose
it to the public internet, and rotate the secret if it ever lands in a log or
build artefact. `/healthz` is intentionally unauthenticated and returns only
`{ ok: true }` to anonymous callers.

## Scaling

One process holds every connection, capped by `MAX_CONCURRENT_BOTS`. Because
sessions live in memory, instances are **not** interchangeable: route all commands
for a given bot to the same instance (single instance, or a sticky router keyed by
`userId:botId`) before scaling out.