import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/PublicShell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Bottly" },
      { name: "description", content: "Learn how to build embeds, slash commands, components and automations in Bottly." },
      { property: "og:title", content: "Docs — Bottly" },
      { property: "og:description", content: "Learn how to build embeds, slash commands, components and automations in Bottly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    body: "Create an account, then open the bot wizard. Pick a plan, name your bot, choose features and Bottly scaffolds everything: design, commands, components and automations.",
  },
  {
    id: "design",
    title: "Designing messages",
    body: "The Design workspace pairs an embed editor with a pixel-accurate Discord preview. Theme presets set accent and embed colors instantly; drag fields to reorder them.",
  },
  {
    id: "commands",
    title: "Slash commands",
    body: "Each command has a name, description, typed options (string, user, channel, number and more), permissions, and a response: text, embed, components or a modal.",
  },
  {
    id: "components",
    title: "Components",
    body: "Add buttons, select menus and modal text inputs. Every change is reflected in the live preview so you can check labels, emoji and styles before shipping.",
  },
  {
    id: "automations",
    title: "Automations",
    body: "Drag triggers, conditions and actions onto the canvas and connect them. Enable a workflow to have your bot run it automatically.",
  },
  {
    id: "deploy",
    title: "Connecting your bot",
    body: "In Settings, paste your Discord bot token and copy the invite URL to add the bot to your server. Your token is verified with Discord, then encrypted and stored server-side — it is never kept in your browser and never sent back to it.",
  },
];

function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Everything you need to go from empty workspace to a live Discord bot.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Docs sections" className="h-max md:sticky md:top-6">
            <ul className="space-y-1.5 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-6">
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
