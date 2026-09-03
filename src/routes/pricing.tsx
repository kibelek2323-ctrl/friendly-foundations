import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_COMPARISON } from "@/data/catalog";
import { AccountNav } from "@/components/auth/AccountNav";
import { useAuthStore } from "@/stores/useAuthStore";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Bottly" },
      {
        name: "description",
        content:
          "Free, Pro and Ultimate plans for building and hosting Discord bots with Bottly.",
      },
      { property: "og:title", content: "Pricing — Bottly" },
      {
        property: "og:description",
        content:
          "Free, Pro and Ultimate plans for building and hosting Discord bots with Bottly.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">B</span>
            </span>
            <span className="font-semibold tracking-tight">Bottly</span>
          </Link>

          <nav
            className="ml-6 hidden gap-5 text-sm text-muted-foreground md:flex"
            aria-label="Marketing"
          >
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link to="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AccountNav />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Pricing that scales with your server
        </h1>

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Start free. Upgrade when your bot outgrows a single server.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.id}
              className="panel flex flex-col p-6"
            >
              <h2 className="text-sm font-semibold">{p.name}</h2>

              <p className="mt-1 text-3xl font-semibold">
                {p.price}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {p.tagline}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2"
                  >
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-5"
                variant={p.id === "pro" ? "default" : "outline"}
              >
                <Link
                  to={
                    initialized && user
                      ? "/billing"
                      : "/register"
                  }
                >
                  Choose {p.name}
                </Link>
              </Button>
            </article>
          ))}
        </div>

        <h2 className="mt-14 text-lg font-semibold">
          Compare plans
        </h2>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Feature
                </th>
                <th className="px-4 py-3 font-medium">
                  Free
                </th>
                <th className="px-4 py-3 font-medium">
                  Pro
                </th>
                <th className="px-4 py-3 font-medium">
                  Ultimate
                </th>
              </tr>
            </thead>

            <tbody>
              {PLAN_COMPARISON.map((row) => (
                <tr
                  key={row.label}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3 font-medium">
                    {row.label}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {row.free}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {row.pro}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {row.ultimate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}