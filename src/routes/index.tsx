import { Suspense, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import { ArrowRight, Check, CloudCog, Code2, Palette, Play, Puzzle, Store, Terminal, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteAnnouncements } from "@/components/layout/SiteAnnouncements";
import { PublicShell } from "@/components/layout/PublicShell";
import { announcementIcon } from "@/lib/announcement-icons";
import { getHomepageContent, DEFAULT_HOMEPAGE } from "@/lib/site-content.functions";

const homepageQuery = queryOptions({
  queryKey: ["homepage-content"],
  queryFn: () => getHomepageContent(),
  staleTime: 5 * 60 * 1000,
});

/** Fades a section in as it scrolls into view. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Mouse-reactive mesh grid behind the hero (tracks the cursor even over text). */
function InteractiveGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);
  const mask = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, black 0%, transparent 100%)`;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const host = ref.current?.parentElement;
      const rect = host?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      mx.set(inside ? x : -9999);
      my.set(inside ? y : -9999);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  const faint =
    "linear-gradient(color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)";
  const bright =
    "linear-gradient(color-mix(in oklab, var(--primary) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--primary) 55%, transparent) 1px, transparent 1px)";

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* base faint mesh */}
      <div className="absolute inset-0" style={{ backgroundImage: faint, backgroundSize: "44px 44px" }} />
      {/* highlighted mesh following the cursor */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: bright,
          backgroundSize: "44px 44px",
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    </div>
  );
}

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homepageQuery),
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

function HeroFallback() {
  const c = DEFAULT_HOMEPAGE;
  return (
    <section className="relative px-4 py-20 text-center lg:py-28">
      <InteractiveGrid />
      <div className="relative z-10 mx-auto max-w-4xl">
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          {c.headlineBefore} <span className="text-primary">{c.headlineAccent}</span>.
        </h1>
      </div>
    </section>
  );
}

function Hero() {
  const { data: c } = useSuspenseQuery(homepageQuery);
  const BadgeIcon = announcementIcon(c.badgeIcon);
  return (
    <section className="relative px-4 py-20 text-center lg:py-28">
      <InteractiveGrid />
      <motion.div className="relative z-10 mx-auto max-w-4xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground">
          <BadgeIcon className="size-3 text-primary" aria-hidden="true" /> {c.badgeText}
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          {c.headlineBefore} <span className="text-primary">{c.headlineAccent}</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{c.subtext}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-1.5">
            <Link to="/bots/new">
              Create your bot <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary/60 bg-background text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Link to="/marketplace">Browse the marketplace</Link>
          </Button>
        </div>
        <dl className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4">
          {c.stats.map((s) => (
            <div key={s.label}>
              <dt className="text-2xl font-semibold">{s.value}</dt>
              <dd className="text-xs text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}

function Landing() {
  return (
    <>
      <SiteAnnouncements />
      <PublicShell>
        <Suspense fallback={<HeroFallback />}>
          <Hero />
        </Suspense>

        <section className="border-y border-border bg-surface/50 py-16">
          <Reveal className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Everything your bot needs</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A complete builder: from the first embed to a multi-step moderation workflow.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURE_CARDS.map((f, i) => (
                <motion.article
                  key={f.title}
                  className="panel p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_14px_36px_-12px_var(--primary)]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-elevated text-primary">
                    <f.icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </motion.article>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal className="grid gap-10 md:grid-cols-2 md:items-center">
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
              ].map(([t, d], i) => (
                <motion.li
                  key={t}
                  className="group relative flex items-start gap-2.5 overflow-hidden rounded-lg bg-elevated/60 p-3 transition-all duration-200 hover:-translate-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                >
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-bottom scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100" />
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">{t}</span>
                    <span className="block text-muted-foreground">{d}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="border-y border-border bg-surface/50 py-16">
          <Reveal className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">From idea to online bot</p>
              <h2 className="mt-2 text-2xl font-semibold">Build, connect and run everything in one workspace</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Every tool shares the same bot data, so a command response can reuse your designs, components and automation variables without rebuilding them in separate apps.</p>
            </div>
            <ol className="mt-9 grid gap-4 md:grid-cols-3">
              {BUILD_STEPS.map(({ icon: Icon, step, title, body }, i) => (
                <motion.li
                  key={step}
                  className="group relative overflow-hidden rounded-lg border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-1 hover:border-b-primary"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-bottom scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100" />
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">STEP {step}</span><Icon className="size-5 text-primary" /></div>
                  <h3 className="mt-7 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.li>
              ))}
            </ol>
          </Reveal>
        </section>

        <Reveal className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr] lg:items-start">
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
            ].map(([title, body], i) => (
              <motion.article
                key={title}
                className="border-t border-border pt-4"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </motion.article>
            ))}
          </div>
        </Reveal>

        <section className="border-y border-border bg-surface/50 py-16">
          <Reveal className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Become a developer</p>
              <h2 className="mt-2 text-2xl font-semibold">Sell the bots you build to the whole community</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Bottly developers publish bots, templates and configurable projects on the marketplace, set their own price in USD and cash out what they earn. Apply once, tell us about your experience and your workflow, and we review it by hand.</p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                ["Publish your work", "Package a finished bot or template and list it with screenshots, tags and a price."],
                ["Earn in USD", "Buyers pay in balance, you request a payout whenever you want."],
                ["Verified badge", "Approved developers get a badge on their public profile."],
              ].map(([title, body]) => (
                <article key={title} className="rounded-lg border border-border bg-background p-5">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
            <Button asChild size="lg" className="mt-8"><Link to="/developer">Apply as a developer <ArrowRight className="size-4" /></Link></Button>
          </Reveal>
        </section>

        <section className="border-t border-border py-16">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
            <div><p className="text-sm font-medium text-primary">Questions before you start?</p><h2 className="mt-2 text-2xl font-semibold">Get clear answers about bots, hosting and the marketplace.</h2></div>
            <Button asChild size="lg"><Link to="/faq">Read the FAQ <ArrowRight className="size-4" /></Link></Button>
          </Reveal>
        </section>
      </PublicShell>
    </>
  );
}
