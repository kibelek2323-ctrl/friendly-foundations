import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { AccountNav } from "@/components/auth/AccountNav";

/** Marketing / public-facing chrome used by pages visitors can browse signed out. */
export function PublicShell({ children }: { children: ReactNode }) {
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
          <nav className="ml-6 hidden gap-5 text-sm text-muted-foreground md:flex" aria-label="Marketing">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/docs" className="hover:text-foreground">Docs</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AccountNav />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Bottly</span>
          <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/login" className="ml-auto hover:text-foreground">Log in</Link>
        </div>
      </footer>
    </div>
  );
}
