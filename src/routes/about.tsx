import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, Heart, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Bottly — the team behind the visual Discord bot builder" },
      {
        name: "description",
        content:
          "Who builds Bottly, why we started it and where the visual Discord bot builder and marketplace are heading.",
      },
      { property: "og:title", content: "About Bottly — the team behind the visual Discord bot builder" },
      {
        property: "og:description",
        content:
          "Who builds Bottly, why we started it and where the visual Discord bot builder and marketplace are heading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const values = [
  {
    icon: Sparkles,
    title: "No code, no ceiling",
    body: "Every feature a coded bot has should be reachable by dragging blocks: commands, components, events and automations.",
  },
  {
    icon: ShieldCheck,
    title: "Your tokens stay safe",
    body: "Bot tokens are verified and encrypted server-side, never returned to the browser and never shared with buyers.",
  },
  {
    icon: Users,
    title: "Creators get paid",
    body: "The marketplace is built so anyone can package a bot, sell it in USD and request a payout of what they earned.",
  },
  {
    icon: Rocket,
    title: "Ship in minutes",
    body: "Templates, onboarding and one-click runtime mean your first working bot is live before your coffee gets cold.",
  },
];

const team = [
  {
    name: "matu",
    role: "Founder",
    body: "Started Bottly and runs the product, design and the marketplace economy — experienced across the whole stack.",
  },
  {
    name: "david0z",
    role: "Developer",
    body: "3 years of Node.js experience. Works on the flow engine, Discord runtime and backend reliability.",
  },
  {
    name: "Antoni D",
    role: "Developer",
    body: "2 years of Node.js experience. Builds the bot builder features, integrations and the marketplace.",
  },
  {
    name: "Ecarnuf",
    role: "Admin",
    body: "Staff and moderation — reviews listings, handles reports and keeps the community safe.",
  },
];

function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm font-medium text-primary">About us</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          We want building a Discord bot to feel like building a playlist
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Bottly started with a simple frustration: every good Discord idea died in a folder of half-finished code.
          Hosting, tokens, intents, rate limits — hours of plumbing before a single command replied. So we built the
          opposite: a visual builder where you design the bot, and the boring parts are already handled.
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">The idea</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A bot is really just messages, buttons and rules about what happens when. Bottly turns that into an editor
            you can actually see: build slash commands, embeds and components, wire automations on a flow canvas, and
            press start. When your bot is good enough to share, publish it on the marketplace — buyers get a working
            copy in their own workspace, and you keep earning from every sale.
          </p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="panel rounded-2xl p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <v.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-medium">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Code2 className="size-5 text-primary" aria-hidden="true" /> The developers
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Bottly is made by a small, independent team — no investors, no growth team, just people who spend far too
            much time in Discord.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {team.map((m) => (
              <div key={m.name} className="panel rounded-2xl p-5">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{m.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mt-12 rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Heart className="size-5 text-primary" aria-hidden="true" /> Where we&apos;re heading
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Next up: richer marketplace tooling for creators, deeper analytics, more templates and a friendlier runtime
            with live logs. Read the documentation to see what already works today.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Read the docs
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              Browse the FAQ
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
