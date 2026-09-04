/**
 * Documentation content for /docs. Each entry is a standalone page rendered by
 * `docs.$slug.tsx`; the index page lists them grouped by category.
 */
export interface DocPage {
  slug: string;
  title: string;
  summary: string;
  /** Discord-flavoured markdown rendered by DiscordMarkdown. */
  body: string;
}

export interface DocCategory {
  label: string;
  description: string;
  pages: DocPage[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    label: "Basics",
    description: "Start here: accounts, the workspace and your first live bot.",
    pages: [
      {
        slug: "getting-started",
        title: "Getting started",
        summary: "From an empty account to a bot answering a slash command in about five minutes.",
        body: `Bottly is a workspace for Discord bots. You design the bot in the browser, connect it with a bot token, and Bottly runs the commands, components and automations for you — no server, no hosting, no deploys.

**The 5 minute path**
1. Create an account and confirm your email address.
2. Open **Dashboard → New bot**, choose a name and a starting template.
3. Design your first embed in the **Design** tab.
4. Add one slash command in the **Commands** tab.
5. Paste your Discord token in **Settings**, invite the bot and run the command in your server.

**What you need before you start**
- A Discord account with permission to add bots to at least one server.
- An application in the Discord Developer Portal (see *Creating a Discord application*).
- Nothing else — there is no CLI, no local setup and no credit card for the free tier.

> Every change is saved to your account, so you can close the tab and pick up exactly where you left off.`,
      },
      {
        slug: "account",
        title: "Your account",
        summary: "Sign-in methods, profile, username and account settings.",
        body: `**Sign in options**
- Email and password (with an emailed 2FA code when enabled).
- Google.
- Discord — this also pulls your Discord avatar in as your Bottly profile picture.

**Account settings** lets you set your public username, display name, avatar and bio. Your username powers your public creator profile at \`/u/username\`, so pick something you are happy to share.

**Account ranks**
- **User** — build and run your own bots, buy from the marketplace.
- **Developer** — everything above plus the Code Editor, Storage Center, marketplace publishing and earnings.
- **Staff / Admin** — moderation and the admin panel.

Ranks are stored server-side and checked on every sensitive action, so they cannot be faked from the browser.`,
      },
      {
        slug: "two-factor",
        title: "Two-factor authentication",
        summary: "Email codes on login and how to recover access.",
        body: `Enable 2FA in **Account settings → Security**. Once it is on, signing in with email and password sends a short code to your inbox from \`auth@bottly.xyz\`.

- Codes are single use and expire after a few minutes.
- Requesting a new code invalidates the previous one.
- Social sign-in (Google, Discord) is already protected by the provider, so no extra code is asked.

If you no longer have access to your inbox, contact the team from the address on your account — we never disable 2FA on request from a different address.`,
      },
      {
        slug: "workspace",
        title: "The workspace",
        summary: "What every tab of a bot workspace does.",
        body: `Each bot has its own workspace:

- **Overview** — status, invite link, quick stats.
- **Design** — embeds, colors, branding.
- **Commands** — slash commands and their responses.
- **Components** — buttons, select menus and modals.
- **Events** — welcome messages, reaction roles and other listeners.
- **Automations** — the visual flow builder.
- **Presence** — activity and status shown in the member list.
- **Configuration** — variables exposed by the bot (mainly for bots bought on the marketplace).
- **Logs** — what your bot actually did, including errors.
- **Settings** — token, runtime, invite permissions, danger zone.

The left sidebar switches bots and sections, the search field jumps between bots and pages, and the bell opens your notification center.`,
      },
      {
        slug: "discord-token",
        title: "Creating a Discord application",
        summary: "Get a bot token, set intents and connect it to Bottly.",
        body: `1. Open the Discord Developer Portal and press **New Application**.
2. Go to the **Bot** tab, press **Reset Token** and copy it.
3. Enable the intents your bot needs — Message Content only if you actually read message text.
4. In Bottly open **Settings → Bot token**, paste the token and save.

Bottly verifies the token against Discord, encrypts it and stores it server-side. It is never kept in your browser and never sent back to it. If you reset the token in Discord, paste the new one in Bottly — the old one stops working immediately.

**Inviting the bot**
Use the invite link on the Overview tab. It already includes the \`bot\` and \`applications.commands\` scopes; without the second one your slash commands never appear.`,
      },
    ],
  },
  {
    label: "Building",
    description: "Design messages, commands, components and automations.",
    pages: [
      {
        slug: "design",
        title: "Designing messages",
        summary: "Embeds, colors, branding and the markdown Discord actually supports.",
        body: `The Design workspace pairs an editor with a pixel-accurate Discord preview.

- **Theme presets** set accent and embed colors in one click.
- **Fields** can be dragged to reorder and toggled inline.
- **Author, footer, thumbnail and image** accept plain URLs.
- The preview renders real Discord markdown, so you can check formatting before shipping.

**Markdown that works in Discord**
\`\`\`
# Big heading
## Medium heading
### Small heading
-# Subtext
**bold** *italic* __underline__ ~~strike~~ \`code\`
> quote
\`\`\`

Mentions use ID syntax, not plain text: \`<#channel_id>\` for a channel, \`<@user_id>\` for a user, \`<@&role_id>\` for a role and \`</name:command_id>\` for a slash command. A bare \`#\` is a heading, not a channel.

**Limits worth knowing**: 6000 characters across an embed, 256 for the title, 4096 for the description, 25 fields, 10 embeds per message.`,
      },
      {
        slug: "commands",
        title: "Slash commands",
        summary: "Names, options, permissions, responses and ephemeral replies.",
        body: `A command has a name, description, options, permissions and a response.

**Options** support string, integer, number, boolean, user, channel, role, mentionable and attachment types. Mark an option required when the command cannot run without it; optional options must come after required ones.

**Responses** can be:
- plain text,
- an embed from the Design tab,
- a message with components,
- a modal that collects input before replying.

**Ephemeral replies** are only visible to the person who ran the command — good for settings, tickets and errors.

**Rules**: names are lowercase, 1–32 characters, no spaces. Discord can take up to an hour to propagate global commands the first time you register them.`,
      },
      {
        slug: "components",
        title: "Buttons, menus and modals",
        summary: "Interactive components and the actions you can attach to them.",
        body: `Components attach to a message and react to clicks.

- **Buttons** — primary, secondary, success, danger or link. Up to 5 per row, 5 rows per message.
- **Select menus** — string, user, role or channel selects with min/max choices.
- **Modals** — up to 5 text inputs, short or paragraph, with placeholders and length limits.

Every component gets an action: send a message, assign a role, open a modal, or start an automation. The live preview shows labels, emoji and styles exactly as Discord renders them.

**Components V2** additionally gives you containers, sections, separators and media galleries for richer layouts.`,
      },
      {
        slug: "automations",
        title: "Automations and the flow builder",
        summary: "Triggers, conditions and actions wired together on a canvas.",
        body: `The flow builder connects **triggers → conditions → actions**.

**Triggers**: member joins or leaves, message sent, reaction added, button clicked, command run, scheduled time.

**Conditions** branch the flow: role checks, channel checks, text matching, number comparisons.

**Actions**: send message, DM the user, add or remove a role, create a channel, timeout a member, call a webhook, wait.

**Variables** let you reuse data across nodes — \`{{user.name}}\`, \`{{server.name}}\`, trigger payload fields and anything you store earlier in the flow.

A workflow only runs when it is **enabled**. The Test panel runs it with sample data, and Logs shows each real run step by step, including which condition stopped the flow.`,
      },
      {
        slug: "events-presence",
        title: "Events and presence",
        summary: "Welcome messages, autorole, reaction roles and bot status.",
        body: `Events run without a command: welcome and goodbye messages, autorole, reaction roles, join logging and boost announcements. Each event has its own channel target and message body.

Presence controls what your bot shows in the member list: status (online, idle, do not disturb, invisible) and activity text such as "Playing /help". Presence changes apply within a few seconds of saving while the bot is running.`,
      },
      {
        slug: "runtime",
        title: "Running your bot",
        summary: "Start, stop, restart and what the runtime does behind the scenes.",
        body: `Once a token is saved, use the run controls on the Overview tab to **start**, **stop** or **restart** your bot. Bottly keeps a session open with Discord, registers your slash commands and dispatches interactions to your commands, components and automations.

- Saving changes to commands re-registers them automatically.
- A stopped bot appears offline in Discord and stops responding.
- Crashes are reported in Logs with the error message and time.

Flow Builder bots always run on the managed Bottly runtime — there is nothing to choose. Code Editor projects pick their runtime in Settings.`,
      },
      {
        slug: "logs",
        title: "Logs and troubleshooting",
        summary: "The usual failure modes and how to fix each one.",
        body: `The Logs tab records command runs, automation executions and runtime errors with timestamps.

**Command not showing** — reinvite the bot with the \`applications.commands\` scope, and wait for global propagation.
**Missing permissions** — the bot's role must sit above the roles it manages and have the needed channel permissions.
**Nothing happens on a button** — the component has no action attached, or the workflow is disabled.
**Bot offline** — the token was reset in Discord; paste the new one in Settings and restart.
**Message not sent** — check the target channel still exists and the bot can see it.
**Rate limited** — Discord throttles bursts; add a wait node between rapid actions.`,
      },
    ],
  },
  {
    label: "Code & storage",
    description: "For Developer accounts: write real code, manage files, expose configuration.",
    pages: [
      {
        slug: "code-editor",
        title: "Code Editor",
        summary: "Write a bot in code instead of the flow builder.",
        body: `Developer accounts get a second way to create a bot: **New bot → Code Editor**. Regular accounts only see the Flow Builder, and the backend re-checks the Developer rank on every save, so the choice cannot be forced from the browser.

The editor is Monaco — the same engine as VS Code:
- file explorer with folders,
- create, rename, move, delete and upload files,
- tabs, syntax highlighting and autocomplete,
- search across the open file,
- unsaved-change warnings before you navigate away.

**Project layout**
\`\`\`
projects/{projectId}/
  bottly_config.json
  package.json
  src/
  assets/
\`\`\`

There is no terminal, Git integration or deploy step — Bottly runs the project for you.`,
      },
      {
        slug: "storage-center",
        title: "Storage Center",
        summary: "Browse and manage every file behind your projects.",
        body: `Storage Center is the file manager shared with the Code Editor. It lists your projects and their files, and lets you upload, download, rename, move and delete them, or create folders.

- Files live in Bottly's managed cloud storage, scoped to your project id.
- Only the project owner (with the Developer rank) can read or write them.
- Credentials never reach the browser — every operation goes through the backend.
- Paths are validated: \`..\` traversal and over-long keys are rejected.

Assets you upload under \`assets/\` can be referenced from your bot code by relative path.`,
      },
      {
        slug: "bot-config",
        title: "bottly_config.json",
        summary: "The schema that turns your code into a configurable product.",
        body: `\`bottly_config.json\` describes the settings your bot exposes. It is a **schema**, not the values — think of it as the settings form your buyers will see.

Each variable has:
\`\`\`
key, type, label, description, default,
editable, required, internal,
options, min, max, placeholder, pattern, category
\`\`\`

**Types**: text, textarea, number, boolean, color, emoji, select, role, channel, user, url.

Use the **Bot Configuration Builder** to add variables through a form, or edit the JSON directly — both write the same file. Keys are lowercase with underscores.

**Never put secrets in here.** Tokens and API keys stay in the internal, server-side settings; anything marked \`internal\` is hidden from buyers entirely.`,
      },
      {
        slug: "buyer-configuration",
        title: "Configuration for buyers",
        summary: "What someone who buys your bot can change — and what they cannot.",
        body: `Code and configuration are deliberately separated. A buyer never receives the Code Editor or the source of a bot they bought.

What they do get is a generated form under **My bots → Configuration**, built from your \`bottly_config.json\`, showing only variables marked \`editable: true\` and not \`internal\`.

Their answers are stored per buyer and validated server-side against your schema — types, required fields, ranges and select options are all enforced, and unknown keys are dropped.

A listing can only be published when its schema validates, so buyers never land on a broken settings form.`,
      },
    ],
  },
  {
    label: "Marketplace",
    description: "Buy bots, sell your own, handle reviews, payouts and referrals.",
    pages: [
      {
        slug: "marketplace-buying",
        title: "Buying a bot",
        summary: "Browsing, discount codes, and what you get after purchase.",
        body: `The marketplace is public — anyone can browse listings without an account. Filter by category, tags and price, or sort by newest, rating, best sellers and price.

A listing page shows the image gallery with arrows, price, seller profile with badges, a markdown description and reviews.

Buying requires an account and enough balance. If you have a discount code, paste it in the purchase box to see the recalculated price before confirming — the quote is recalculated server-side, so the price shown is the price you pay.

After purchase the bot appears in your dashboard. Bots bought on the marketplace are configured, not rewritten: you adjust the exposed variables and branding, the original logic stays intact.`,
      },
      {
        slug: "marketplace-selling",
        title: "Selling your bot",
        summary: "Publishing requirements, images, pricing and the 10% commission.",
        body: `Open **Marketplace → Publish** and pick one of your bots. Publishing requires the Developer rank.

A good listing has:
- a clear title and category,
- up to 6 uploaded images (max 5 MB each, PNG/JPG/WebP) — uploads, not links,
- a markdown description covering features, setup and limits,
- accurate tags,
- a fair price in USD (0 makes it free).

Listings are copies: buyers get a clone, you keep your original. Bottly keeps a **10% commission** on each sale, the rest lands in your balance. You can unpublish at any time from **My listings**; banned accounts cannot publish.`,
      },
      {
        slug: "reviews-reports",
        title: "Reviews, reports and moderation",
        summary: "How feedback and rule enforcement work.",
        body: `Only buyers can review a listing: 1–5 stars plus an optional comment. The average and review count appear on cards and the listing page. You can edit or delete your own review.

If a listing breaks the rules, use **Report** on the listing page. Reports go to a moderation queue where the team can hide the listing, resolve or dismiss the report. You get a notification when your report is handled.

Repeated violations can lead to a listing being removed or an account being banned from publishing.`,
      },
      {
        slug: "profiles-badges",
        title: "Creator profiles and badges",
        summary: "Your public page and what each badge means.",
        body: `Every seller has a public profile at \`/u/username\` with their bio, badges, sales stats and active listings. Set your username, avatar and bio in **Account settings**.

Badges appear as small icons next to your name across the marketplace; hover one to see its name. They mark things like verified creators, staff, developers and early members. Verification is granted manually by the team to creators with a consistent sales and review history.`,
      },
      {
        slug: "referrals",
        title: "Referrals",
        summary: "Custom referral codes and what you earn.",
        body: `Create your own referral code in **Referrals** — you pick the text, so it can match your brand. Share the generated link; anyone who signs up through it is attributed to you.

The Referrals page shows your codes, how many signups each brought and the reward earned. Rewards are credited to your Bottly balance automatically.`,
      },
      {
        slug: "payouts",
        title: "Payouts",
        summary: "Withdrawing your earnings in crypto.",
        body: `Request a payout from **Payouts**. Payouts are crypto only: pick the coin and paste the destination address for that network.

- Double-check the network — funds sent to an address on the wrong chain are unrecoverable.
- Requests are reviewed by the team before they are sent.
- The requested amount is held while the request is pending, and returns to your balance if it is rejected.
- Each request keeps its status and history on the page.`,
      },
    ],
  },
  {
    label: "Billing",
    description: "Balance, crypto payments, plans and codes.",
    pages: [
      {
        slug: "balance",
        title: "Balance",
        summary: "Your USD balance, history and how to top it up.",
        body: `Your balance is shown in USD next to your avatar. Clicking the wallet icon opens **/balance** with the current amount, full transaction history and top-up options.

Purchases, sales, refunds, referral rewards, payouts and admin adjustments all appear in the history with a timestamp and description.

**Top-ups** work in two ways: redeem a balance code, or pay with crypto (see *Crypto payments*).`,
      },
      {
        slug: "crypto-payments",
        title: "Crypto payments",
        summary: "Coin choice, QR codes, confirmations and automatic crediting.",
        body: `Crypto checkout is built into Bottly. Pick a coin, and the checkout shows:

- a **QR code** — switch between *address only* and *address + amount*, which pre-fills the amount in most wallets,
- the exact amount and deposit address (with a memo/tag when the coin needs one),
- a live status: payment detected, confirmations, partial payment,
- an expiry countdown for the quoted rate,
- a link to view the transaction on a blockchain explorer.

Status refreshes by itself every few seconds — no reloading. Your balance or plan is credited automatically once the network confirms the transfer, and the crypto payments history on **/balance** keeps every attempt with its status, amount, currency and expiry.

**Tips**: send exactly the quoted amount, on exactly the shown network. Sending a different amount can leave the payment partially paid; using the wrong network can lose the funds.`,
      },
      {
        slug: "plans",
        title: "Plans",
        summary: "What each tier unlocks and how upgrades work.",
        body: `Plans control how many bots you can run, how many commands each bot may have, your daily AI message allowance and whether branding editing is unlocked.

Manage everything in **Billing**: see your current tier and usage bars, buy or extend a plan with crypto, apply a discount code before paying, or redeem a plan code.

Downgrading keeps your data: bots above the new limit are paused rather than deleted.`,
      },
      {
        slug: "codes",
        title: "Codes",
        summary: "Plan codes, balance codes and discount codes.",
        body: `Bottly uses three kinds of codes:

- **Plan codes** activate a plan for a period of time — redeem them in Billing.
- **Balance codes** credit a fixed USD amount to your balance.
- **Discount codes** reduce the price of a purchase or plan by a percentage — apply them before paying.

Codes can be limited by number of uses and an expiry date, and each account can normally redeem a given code once. An invalid, used or expired code is rejected server-side with a clear message.`,
      },
    ],
  },
  {
    label: "Platform",
    description: "Notifications, security, status and where to go next.",
    pages: [
      {
        slug: "notifications",
        title: "Notifications and announcements",
        summary: "The bell, the announcement bar and the popup.",
        body: `The bell in the header collects sales, purchases, moderation results, balance changes and platform announcements. Unread items are highlighted; opening the panel marks them as read.

Site-wide announcements can also appear as a top bar or a popup. Signed-in users see a popup once per session; signed-out visitors see it on the landing page until they dismiss it.`,
      },
      {
        slug: "security",
        title: "Security and privacy",
        summary: "How your tokens, files and data are protected.",
        body: `- Bot tokens are encrypted at rest and never exposed to the browser.
- Every table uses row-level security, so you only ever read your own data.
- Admin and Developer actions require a server-verified role, not a client flag.
- Marketplace images and project files are stored privately and served through short-lived signed URLs.
- Crypto payments are only credited after a signature-verified provider callback.

Never share your Discord token in a listing description, screenshot or support message. If you think it leaked, reset it in the Developer Portal and paste the new one in Settings.`,
      },
      {
        slug: "status-support",
        title: "Status and support",
        summary: "Live health, FAQ and how to reach the team.",
        body: `**Status** shows live platform health and any ongoing incident. **FAQ** has short answers to the most common questions, and the **Blog** and **Changelog** cover guides and release notes.

Still stuck? Reach the team through the community links in the footer, or reply to any Bottly email. Include your account email, the bot in question and what you expected to happen — it gets you a useful answer much faster.`,
      },
    ],
  },
];

export const DOC_PAGES: DocPage[] = DOC_CATEGORIES.flatMap((c) => c.pages);

export function findDocPage(slug: string): { page: DocPage; category: DocCategory } | null {
  for (const category of DOC_CATEGORIES) {
    const page = category.pages.find((p) => p.slug === slug);
    if (page) return { page, category };
  }
  return null;
}

export function adjacentDocPages(slug: string): { prev: DocPage | null; next: DocPage | null } {
  const i = DOC_PAGES.findIndex((p) => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: DOC_PAGES[i - 1] ?? null, next: DOC_PAGES[i + 1] ?? null };
}
