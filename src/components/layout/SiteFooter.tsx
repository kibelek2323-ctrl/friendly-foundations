import { Link } from "@tanstack/react-router";
import { Send, Zap } from "lucide-react";

/** Placeholder community links — swap the hrefs once the real invites exist. */
const SOCIALS = [
  { label: "Discord", href: "https://discord.gg/bottly", icon: DiscordIcon },
  { label: "Telegram", href: "https://t.me/bottly", icon: Send },
] as const;

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Marketplace", to: "/marketplace" as const },
      { label: "Templates", to: "/templates" as const },
      { label: "Pricing", to: "/pricing" as const },
      { label: "Changelog", to: "/changelog" as const },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", to: "/docs" as const },
      { label: "Blog", to: "/blog" as const },
      { label: "FAQ", to: "/faq" as const },
      { label: "Status", to: "/status" as const },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", to: "/about" as const },
      { label: "Terms", to: "/terms" as const },
      { label: "Sign in", to: "/login" as const },
      { label: "Create account", to: "/register" as const },
    ],
  },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.446 3a13.9 13.9 0 0 0-.62 1.27 18.28 18.28 0 0 0-5.65 0A13.7 13.7 0 0 0 8.55 3a19.74 19.74 0 0 0-4.87 1.37C.55 9.045-.32 13.6.11 18.09a19.9 19.9 0 0 0 6.03 3.06c.49-.66.92-1.36 1.29-2.1-.71-.27-1.39-.6-2.03-.98.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.2 0c.16.14.33.27.5.4-.64.38-1.32.71-2.03.98.37.74.8 1.44 1.29 2.1a19.87 19.87 0 0 0 6.03-3.06c.5-5.18-.86-9.7-3.58-13.72ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.41s.95-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.41-2.16 2.41Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.41s.95-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.41-2.16 2.41Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-elevated/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" aria-hidden="true" />
              </span>
              <span className="font-semibold tracking-tight">Bottly</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Build, run and sell Discord bots from one workspace — no hosting, no deploys.
            </p>
            <div className="mt-4 flex gap-2">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  title={label}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground">{column.heading}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Bottly. All rights reserved.</span>
          <span className="ml-auto">Not affiliated with Discord Inc.</span>
        </div>
      </div>
    </footer>
  );
}
