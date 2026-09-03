import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { amIAdmin } from "@/lib/admin-codes.functions";

export const Route = createFileRoute("/xadmx")({
  head: () => ({
    meta: [
      { title: "Bottly — panel" },
      { name: "description", content: "Internal Bottly admin sign-in." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Bottly — panel" },
      { property: "og:description", content: "Internal Bottly admin sign-in." },
    ],
  }),
  component: Page,
});

function Page() {
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm rounded-xl p-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Bottly</span>
        </div>
        <h1 className="mt-5 text-lg font-semibold tracking-tight">Logowanie</h1>
        <p className="mt-1 text-xs text-muted-foreground">Admin-only access before launch.</p>

        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            const { error: err } = await signIn(email, password);
            if (err) {
              setBusy(false);
              setError(err);
              return;
            }
            const admin = await amIAdmin().catch(() => false);
            setBusy(false);
            if (admin !== true) {
              setError("This account does not have administrator access.");
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ["am-i-admin"] });
            void navigate({ to: "/dashboard" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || busy}>
            {loading || busy ? "Logowanie…" : "Zaloguj"}
          </Button>
        </form>
      </div>
    </div>
  );
}
