import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Palette, Puzzle, Store, Terminal, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { defaultDesign, createComponent } from "@/data/factories";
import { PLANS } from "@/data/catalog";
import { AccountNav } from "@/components/auth/AccountNav";
import { SiteAnnouncements } from "@/components/layout/SiteAnnouncements";

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

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteAnnouncements />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Bottly</span>
          </Link>
          <nav className="ml-6 hidden gap-5 text-sm text-muted-foreground md:flex" aria-label="Marketing">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/docs" className="hover:text-foreground">Docs</Link>
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AccountNav />
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-primary" aria-hidden="true" /> No code. No hosting headaches.
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Build Discord bots <span className="text-primary">visually</span>.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              Bottly turns embeds, slash commands, buttons and automations into a drag-and-drop workspace with a
              pixel-accurate Discord preview beside every change.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-1.5">
                <Link to="/bots/new">
                  Create your bot <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/marketplace">Browse the marketplace</Link>
              </Button>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
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

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <DiscordMessagePreview design={demoDesign} components={demoComponents} channelName="welcome" />
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
          <div className="panel grid gap-8 p-8 md:grid-cols-2 md:items-center">
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

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-2xl font-semibold tracking-tight">Simple pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <article key={p.id} className="panel flex flex-col p-6">
                <h3 className="text-sm font-semibold">{p.name}</h3>
                <p className="mt-1 text-3xl font-semibold">{p.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-5" variant={p.id === "pro" ? "default" : "outline"}>
                  <Link to="/register">Choose {p.name}</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Bottly</span>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/login" className="ml-auto hover:text-foreground">Log in</Link>
        </div>
      </footer>
    </div>
  );
}
