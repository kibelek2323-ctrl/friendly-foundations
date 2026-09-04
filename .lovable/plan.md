# Code Editor, Storage Center and bot configuration

Adds a second way to build bots — writing code — on top of everything Bottly already has. Flow Builder, Marketplace, My Bots and the Developer rank stay exactly as they are.

## What you get

**Choosing how to build**
Creating a bot starts with a choice screen: Flow Builder or Code Editor. The Code Editor card only appears for accounts with the existing Developer rank; everyone else goes straight to the Flow Builder as today. The server refuses every code/file write from a non-Developer, so hiding the button is not the only protection.

**Code Editor**
A full editor (Monaco) with a file tree on the left, tabs, syntax highlighting, autocomplete, search, and an unsaved-changes marker. Create, rename, move, delete and upload files and folders. Loading, empty and error states throughout, in the current dark blue Bottly style.

**Storage Center**
One shared place listing all your code projects and their files. The editor reads and writes through it, so there is only ever one storage. Files live in your Google Cloud bucket; the browser never sees any Google credentials.

**Bot Configuration (for the creator)**
Each code bot has a "Bot Configuration" panel where you add the settings buyers may change: label, key, type, description, default value, required, validation, group, and whether buyers can edit it or it stays internal. This writes `bottly_config.json` into the project, and you can also edit that file by hand — both views stay in sync. Types: text, textarea, number, boolean, color, emoji, select, role, channel, user, URL, with room for more later.

**Publishing checks**
Before a code bot can be listed on the Marketplace we check ownership, Developer rank, required files present, valid config (no duplicate keys, valid types, defaults matching their type, sane validation rules). Errors are listed precisely instead of a generic failure.

**Buyer configuration**
After buying, a code bot appears in My Bots with a Configuration page only — no code, no files, no `bottly_config.json`, no internal settings, no secrets. The form is generated from the creator's schema, shows only settings marked editable, and each buyer's values are stored separately from the creator's defaults and from other buyers.

## Technical outline

Existing pieces reused: `hasDeveloperAccess` / `DEVELOPER_BADGE` (`src/lib/roles.functions.ts`), `requireSupabaseAuth`, `marketplace_listings` / `marketplace_purchases` and `purchase_listing*` RPCs, the `bots` table and `useBotStore`.

Database (one migration, with GRANTs + RLS per table):
- `code_projects` — id, owner_id, bot_id (links to the existing bot record), name, storage_prefix, entry files metadata, timestamps. Owner-only policies.
- `code_project_files` — index/metadata only (path, size, content type, updated_at, project_id); file bytes live in GCS, not in Postgres.
- `bot_config_schemas` — project_id, listing_id (nullable until published), version, schema JSONB, timestamps.
- `buyer_configurations` — project_id/listing_id, buyer_id, values JSONB, timestamps; unique per (listing, buyer); read/write only by the buyer, verified against `marketplace_purchases`.
- `marketplace_listings` gains `source_project_id` + `kind` ('flow' | 'code') so the existing listing/purchase flow carries code bots too.

Storage layer: `src/lib/storage/gcs.server.ts` implements `uploadFile / downloadFile / deleteFile / renameFile / moveFile / listFiles / getFile / createFolder` against GCS via its JSON API with a service-account signed JWT (no Node-only SDK — the backend runs on a Worker runtime). All paths are `projects/{projectId}/...`, derived server-side from the project row; client-supplied paths are normalised and confined to the project prefix.

Server functions (`src/lib/code-projects.functions.ts`, `src/lib/bot-config.functions.ts`), all behind `requireSupabaseAuth` and, for writes, a Developer + ownership check returning 403: list/get/create/update/delete/rename/move/upload file, get/update config schema, validate config, get/update buyer configuration (purchase verified server-side, non-editable and internal keys stripped on save).

UI: `src/routes/_authenticated/bots.new.tsx` gains the builder-choice step; new routes for the editor (`/projects/$projectId/code`), Storage Center (`/storage`), and buyer configuration under the existing bot pages. Monaco added via `@monaco-editor/react`, loaded client-only.

Not included, by design: hosting, terminal, code execution, Git, Cloud Run deployment.

## What you need to provide

Your Google Cloud bucket name and a service-account JSON key with object read/write on that bucket — saved as backend secrets (`GCS_BUCKET`, `GCS_SERVICE_ACCOUNT_JSON`), never in the app. The service account needs the Storage Object Admin role limited to that bucket; CORS on the bucket is not required since all traffic goes through the backend.

After building I'll run typecheck, lint and build, and walk the 20 checks from your list.
