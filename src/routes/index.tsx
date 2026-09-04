import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, CloudCog, Palette, Play, Puzzle, Store, Terminal, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { defaultDesign, createComponent } from "@/data/factories";
import { SiteAnnouncements } from "@/components/layout/SiteAnnouncements";
import { PublicShell } from "@/components/layout/PublicShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bottly — Build Discord bots without code" },
      {
        name: "description",
        content:
          "Bottly is a visual Discord bot creator: design embeds, slash commands, buttons and automations with a live preview.",
      },
      { property: "og:title", content: "Bottly — Build Discord bots without code" },
      {
        property: "og:description",
        content: "Design embeds, slash commands, buttons and automations visually, with a pixel-accurate live preview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const demoDesign = {
  ...defaultDesign("Bottly Helper"),
  messageContent: "Welcome to the server, <@newcomer>! Here's everything you need to get started.",
};
const demoComponents = [createComponent("button"), createComponent("string-select")];

const FEATURE_CARDS = [
  { icon: Palette, title: "Visual embed designer", body: "Build rich embeds with authors, fields, images and footers — see them exactly as Discord renders them." },
  { icon: Terminal, title: "Slash command builder", body: "Define options, autocomplete, permissions and ephemeral responses without touching discord.js." },
  { icon: Puzzle, title: "Interactive components", body: "Buttons, select menus and modals with live preview and per-component settings." },
  { icon: Workflow, title: "Automation canvas", body: "Chain triggers, conditions and actions on a drag-and-drop flow canvas." },
];

const BUILD_STEPS = [
  { icon: Palette, step: "1", title: "Design the experience", body: "Shape messages, embeds, commands, buttons and menus with a Discord-accurate preview." },
  { icon: Workflow, step: "2", title: "Connect the logic", body: "Build event-driven flows with triggers, conditions, actions and reusable variables." },
  { icon: Play, step: "3", title: "Launch and monitor", body: "Connect your Discord bot, start it from the dashboard and follow runtime activity." },
];

function Landing() {
  return (
    <>
      <SiteAnnouncements />
      <PublicShell>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center lg:py-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-primary" aria-hidden="true" /> No code. No hosting headaches.
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Build Discord bots <span className="text-primary">visually</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Bottly turns embeds, slash commands, buttons and automations into a drag-and-drop workspace with a
              pixel-accurate Discord preview beside every change.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-1.5">
                <Link to="/bots/new">
                  Create your bot <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/marketplace">Browse the marketplace</Link>
              </Button>
            </div>
            <dl className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4">
              {[
                ["120k+", "bots built"],
                ["18M", "members reached"],
                ["99.9%", "uptime"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-semibold">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </section>

        <section className="border-y border-border bg-surface/50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Everything your bot needs</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A complete builder: from the first embed to a multi-step moderation workflow.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURE_CARDS.map((f) => (
                <article key={f.title} className="panel p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-elevated text-primary">
                    <f.icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground">
                <Store className="size-3 text-primary" aria-hidden="true" /> Bottly Marketplace
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Buy and sell ready-made bots</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Browse the marketplace without an account, preview screenshots and full descriptions, then buy a bot with
                your USD balance — it lands in your dashboard instantly, ready to customise and launch.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="gap-1.5">
                  <Link to="/marketplace">
                    Browse the marketplace <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/marketplace/publish">Sell your bot</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-3 text-sm">
              {[
                ["Instant delivery", "Purchases copy the full bot — commands, embeds and automations included."],
                ["Screenshots & markdown", "Sellers showcase their bot with an image gallery and rich description."],
                ["USD balance", "Top up with a balance code and buy in one click."],
                ["Earn from your builds", "Publish once, keep selling to the community."],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-2.5 rounded-lg bg-elevated/60 p-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">{t}</span>
                    <span className="block text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-border bg-surface/50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">From idea to online bot</p>
              <h2 className="mt-2 text-2xl font-semibold">Build, connect and run everything in one workspace</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Every tool shares the same bot data, so a command response can reuse your designs, components and automation variables without rebuilding them in separate apps.</p>
            </div>
            <ol className="mt-9 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
              {BUILD_STEPS.map(({ icon: Icon, step, title, body }) => (
                <li key={step} className="bg-background p-6">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">STEP {step}</span><Icon className="size-5 text-primary" /></div>
                  <h3 className="mt-7 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-elevated text-primary"><CloudCog className="size-5" /></span>
            <h2 className="mt-4 text-2xl font-semibold">Built for real communities</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Move beyond a single welcome message. Build moderation workflows, support interactions, role menus and scheduled actions while keeping every change visible and manageable.</p>
            <Button asChild variant="outline" className="mt-6"><Link to="/docs">Explore the documentation <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["One visual system", "Commands, components and automations stay connected instead of drifting across scripts and dashboards."],
              ["Safer iteration", "Preview Discord output before publishing changes and keep sensitive bot credentials on the server."],
              ["Reusable marketplace bots", "Start from a complete community-built bot, then customise its identity for your server."],
              ["Operational visibility", "See runtime state, recent events, errors and important account updates from the dashboard."],
            ].map(([title, body]) => <article key={title} className="border-t border-border pt-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></article>)}
          </div>
        </section>

        <section className="border-t border-border py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
            <div><p className="text-sm font-medium text-primary">Questions before you start?</p><h2 className="mt-2 text-2xl font-semibold">Get clear answers about bots, hosting and the marketplace.</h2></div>
            <Button asChild size="lg"><Link to="/faq">Read the FAQ <ArrowRight className="size-4" /></Link></Button>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
