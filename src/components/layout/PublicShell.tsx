import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Zap } from "lucide-react";
import { AccountNav } from "@/components/auth/AccountNav";

/** Marketing / public-facing chrome used by pages visitors can browse signed out. */
export function PublicShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const fromCountdown = new URLSearchParams(location.search).get("from") === "countdown";

  if (fromCountdown) {
    return (
      <div className="relative min-h-screen bg-background">
        <Link
          to="/"
          className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-muted"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to countdown
        </Link>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Bottly</span>
          </Link>
          <nav className="ml-6 hidden gap-1 text-sm text-muted-foreground md:flex" aria-label="Marketing">
            <Link to="/marketplace" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">Marketplace<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>
            <Link to="/templates" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">Templates<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>
            <Link to="/docs" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">Docs<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>
            <Link to="/blog" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">Blog<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>

            <Link to="/faq" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">FAQ<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>
            <Link to="/status" className="group relative rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground">Status<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100" /></Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AccountNav />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
