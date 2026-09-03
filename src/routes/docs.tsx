import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/PublicShell";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — build, sell and run Discord bots | Bottly" },
      {
        name: "description",
        content:
          "Complete Bottly documentation: bot wizard, embeds, slash commands, components, automations, marketplace selling, balance, discount codes and troubleshooting.",
      },
      { property: "og:title", content: "Docs — build, sell and run Discord bots | Bottly" },
      {
        property: "og:description",
        content:
          "Complete Bottly documentation: bot wizard, embeds, slash commands, components, automations, marketplace, balance and troubleshooting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

interface DocSection {
  id: string;
  title: string;
  body: string;
}

interface DocGroup {
  label: string;
  sections: DocSection[];
}

const GROUPS: DocGroup[] = [
  {
    label: "Basics",
    sections: [
      {
        id: "getting-started",
        title: "Getting started",
        body: `Bottly is a no-code workspace for Discord bots. You design the bot in the browser, connect it with a bot token, and Bottly runs the commands, components and automations for you.

**The 5 minute path**
1. Create an account and confirm your email.
2. Open **Dashboard → New bot** and pick a name plus a starting template.
3. Design your first embed in the **Design** tab.
4. Add one slash command in the **Commands** tab.
5. Paste your Discord token in **Settings**, invite the bot and try the command in your server.

> Every workspace change is saved to your account, so you can leave the tab and come back later.`,
      },
      {
        id: "workspace",
        title: "The workspace",
        body: `Each bot has its own workspace with dedicated tabs:

- **Overview** — status, invite link, quick stats.
- **Design** — embeds, colors, branding.
- **Commands** — slash commands and their responses.
- **Components** — buttons, select menus and modals.
- **Events** — welcome messages, reaction roles and other listeners.
- **Automations** — the visual flow builder.
- **Presence** — activity and status of the bot user.
- **Logs** — what your bot actually did, with errors.
- **Settings** — token, invite permissions, danger zone.

The left sidebar switches bots; the search field jumps between bots and pages, and the bell icon opens your notification center.`,
      },
      {
        id: "discord-token",
        title: "Creating a Discord application",
        body: `1. Go to the Discord Developer Portal and press **New Application**.
2. Open the **Bot** tab, then **Reset Token** and copy it.
3. Enable the intents your bot needs (Message Content only if you read message text).
4. In Bottly open **Settings → Bot token**, paste the token and save.

Bottly verifies the token against Discord, encrypts it and stores it server-side. It is never kept in your browser and never sent back to it. If you reset the token in Discord, paste the new one in Bottly — the old one stops working immediately.`,
      },
    ],
  },
  {
    label: "Building",
    sections: [
      {
        id: "design",
        title: "Designing messages",
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
Mentions use ID syntax, not plain text: \`<#channel_id>\` for a channel, \`<@user_id>\` for a user, \`<@&role_id>\` for a role and \`</name:command_id>\` for a slash command. A bare \`#\` is a heading, not a channel.`,
      },
      {
        id: "commands",
        title: "Slash commands",
        body: `A command has a name, description, options, permissions and a response.

**Options** support string, integer, number, boolean, user, channel, role, mentionable and attachment types. Mark an option required when the command cannot run without it; optional options must come after required ones.

**Responses** can be:
- plain text,
- an embed from the Design tab,
- a message with components,
- a modal that collects input before replying.

**Ephemeral replies** are only visible to the person who ran the command — good for settings, tickets and errors.

Command names must be lowercase, 1–32 characters, no spaces. Discord may take up to an hour to propagate global commands the first time.`,
      },
      {
        id: "components",
        title: "Buttons, menus and modals",
        body: `Components attach to a message and react to clicks.

- **Buttons** — primary, secondary, success, danger or link. Up to 5 per row, 5 rows per message.
- **Select menus** — string, user, role or channel selects with min/max choices.
- **Modals** — up to 5 text inputs, short or paragraph, with placeholders and length limits.

Every component gets an action: send a message, assign a role, open a modal, or start an automation. The live preview shows labels, emoji and styles exactly as Discord renders them.`,
      },
      {
        id: "automations",
        title: "Automations",
        body: `The flow builder connects **triggers → conditions → actions**.

Common triggers: member joins, message sent, reaction added, button clicked, command run, scheduled time.

Conditions branch the flow: role checks, channel checks, text matching, number comparisons.

Actions: send message, DM the user, add or remove a role, create a channel, add a timeout, call a webhook, wait.

A workflow only runs when it is **enabled**. Use the Logs tab to see each run step by step, including which condition stopped the flow.`,
      },
      {
        id: "events",
        title: "Events and presence",
        body: `Events run without a command: welcome and goodbye messages, autorole, reaction roles, join logging and boost announcements. Each event has its own channel target and message body.

Presence controls what your bot shows in the member list: status (online, idle, do not disturb) and activity text such as "Playing /help".`,
      },
      {
        id: "logs",
        title: "Logs and debugging",
        body: `The Logs tab records command runs, automation executions and runtime errors with timestamps.

Typical issues:
- **Command not showing** — reinvite the bot with the \`applications.commands\` scope.
- **Missing permissions** — the bot role must be above the roles it manages.
- **Nothing happens on a button** — the component has no action attached, or the workflow is disabled.
- **Bot offline** — the token was reset in Discord; paste the new one in Settings.`,
      },
    ],
  },
  {
    label: "Marketplace",
    sections: [
      {
        id: "marketplace-buying",
        title: "Buying a bot",
        body: `The marketplace is public — anyone can browse listings without an account. Filter by category, tags and price, or sort by newest, rating, best sellers and price.

A listing page shows the image gallery, price, seller profile with a **Verified** badge when applicable, a markdown description and reviews.

Buying requires an account and enough balance. If you have a discount code, paste it in the purchase box to see the recalculated price before confirming. After purchase the bot lands in your dashboard.

Purchased bots are locked to appearance edits: you can rebrand the design, but the original command and automation logic stays intact.`,
      },
      {
        id: "marketplace-selling",
        title: "Selling your bot",
        body: `Open **Marketplace → Publish** and pick one of your bots.

A good listing has:
- a clear title and category,
- up to 6 uploaded images (max 5 MB each, PNG/JPG/WebP),
- a markdown description covering features, setup and limits,
- accurate tags,
- a fair price in USD (0 makes it free).

Listings are copies: buyers get a clone, you keep your original. You can unpublish at any time from **My listings**. Banned accounts cannot publish.`,
      },
      {
        id: "reviews",
        title: "Reviews and reports",
        body: `Only buyers can review a listing: 1–5 stars plus an optional comment. The average and review count appear on cards and the listing page. You can edit or delete your own review.

If a listing breaks the rules, use **Report** on the listing page. Reports go to a moderation queue where the team can hide the listing, resolve or dismiss the report. You get a notification when your report is handled.`,
      },
      {
        id: "profiles",
        title: "Creator profiles",
        body: `Every seller has a public profile at \`/u/username\` with their bio, verification badge, sales stats and active listings. Set your username, avatar and bio in **Account settings**.

Verification is granted manually by the team to creators with a consistent sales and review history.`,
      },
    ],
  },
  {
    label: "Account",
    sections: [
      {
        id: "balance",
        title: "Balance and top-ups",
        body: `Your balance is shown in USD next to your avatar. Clicking it opens **/balance** with the current amount, full transaction history and a top-up box.

Top-ups use codes: paste a balance code and the amount is credited instantly. Purchases, refunds and admin adjustments all appear in the history with a timestamp and description.`,
      },
      {
        id: "discounts",
        title: "Discount codes",
        body: `Discount codes reduce the price of a marketplace purchase by a percentage. Enter the code on the listing page before confirming; the quote is recalculated server-side, so the shown price is the price you pay.

A code can be limited by number of uses and expiry date, and each account can normally redeem it once.`,
      },
      {
        id: "plans",
        title: "Plans and billing",
        body: `Plans control how many bots you can run and which features are unlocked. Manage your plan in **Billing**, where you can also redeem plan codes.

Downgrading keeps your data: bots above the new limit are paused rather than deleted.`,
      },
      {
        id: "notifications",
        title: "Notifications",
        body: `The bell in the dashboard header collects sales, purchases, moderation results, balance changes and platform announcements. Unread items are highlighted; opening the panel marks them as read.

Site-wide announcements can also appear as a popup or a top bar when the team publishes something important.`,
      },
      {
        id: "security",
        title: "Security and privacy",
        body: `- Bot tokens are encrypted at rest and never exposed to the browser.
- Every table uses row-level security, so you only ever read your own data.
- Admin actions require a server-verified role, not a client flag.
- Marketplace images are stored privately and served through short-lived signed URLs.

Never share your Discord token in a listing description, screenshot or support message. If you think it leaked, reset it in the Developer Portal and paste the new one in Settings.`,
      },
      {
        id: "faq-links",
        title: "Where to go next",
        body: `- Read the **FAQ** for short answers to common questions.
- Check **Status** for live platform health.
- Follow the **Blog** for guides and the **Changelog** for release notes.`,
      },
    ],
  },
];

function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything you need to go from an empty workspace to a live Discord bot — and to selling it on the
          marketplace.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Docs sections" className="h-max md:sticky md:top-6">
            <ul className="space-y-5 text-sm">
              {GROUPS.map((group) => (
                <li key={group.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{group.label}</p>
                  <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                    {group.sections.map((s) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {GROUPS.map((group) => (
              <div key={group.label} className="space-y-8">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">{group.label}</p>
                {group.sections.map((s) => (
                  <section key={s.id} id={s.id} className="scroll-mt-6 border-t border-border pt-6 first:border-0 first:pt-0">
                    <h2 className="text-lg font-semibold">{s.title}</h2>
                    <DiscordMarkdown
                      text={s.body}
                      flavor="plain"
                      className="mt-3 text-sm leading-relaxed text-muted-foreground"
                    />
                  </section>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
