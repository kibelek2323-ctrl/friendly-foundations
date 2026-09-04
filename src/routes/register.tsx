import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { DiscordButton } from "@/components/auth/DiscordButton";
import { useAuthStore } from "@/stores/useAuthStore";
import { PENDING_REFERRAL_KEY } from "@/lib/referral-storage";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Bottly" },
      { name: "description", content: "Start building Discord bots visually with a free Bottly account." },
      { property: "og:title", content: "Create your account — Bottly" },
      { property: "og:description", content: "Start building Discord bots visually with a free Bottly account." },
    ],
  }),
  component: Page,
});

function Page() {
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) {
      localStorage.setItem(PENDING_REFERRAL_KEY, code);
      setRefCode(code);
    } else {
      setRefCode(localStorage.getItem(PENDING_REFERRAL_KEY));
    }
  }, []);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free forever for your first bot."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {sent ? (
        <p aria-live="polite" className="rounded-md border border-border bg-elevated p-4 text-sm text-muted-foreground">
          Almost there — we sent a confirmation link to{" "}
          <span className="text-foreground">{email}</span>. Open it to activate your workspace, then log in.
        </p>
      ) : (
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (!name.trim() || !email.includes("@") || password.length < 6) {
            setError("Fill in your name, a valid email and a password of at least 6 characters.");
            return;
          }
          const { error: err, needsConfirmation } = await signUp(email, password, name.trim());
          if (err) {
            setError(err);
            return;
          }
          if (needsConfirmation) {
            setSent(true);
            toast.success("Account created — confirm your email to continue");
            return;
          }
          toast.success("Account created");
          void navigate({ to: "/onboarding" });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {refCode && (
          <p className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-muted-foreground">
            Referral code <span className="font-mono text-foreground">{refCode}</span> will be applied to your account.
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <GoogleButton label="Sign up with Google" />
        <DiscordButton label="Sign up with Discord" />
      </form>
      )}
    </AuthLayout>
  );
}
