import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { DiscordButton } from "@/components/auth/DiscordButton";
import { useAuthStore } from "@/stores/useAuthStore";
import { sendTwoFactorCode, startLoginChallenge, verifyTwoFactorCode } from "@/lib/twofa.functions";
import { TWO_FACTOR_PENDING_KEY } from "@/lib/two-factor-gate";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Bottly" },
      { name: "description", content: "Sign in to your Bottly workspace to manage your Discord bots." },
      { property: "og:title", content: "Log in — Bottly" },
      { property: "og:description", content: "Sign in to your Bottly workspace to manage your Discord bots." },
    ],
  }),
  component: Page,
});

function Page() {
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const challenge = useServerFn(startLoginChallenge);
  const verify = useServerFn(verifyTwoFactorCode);
  const resend = useServerFn(sendTwoFactorCode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"password" | "code">("password");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const cancel = () => {
    localStorage.removeItem(TWO_FACTOR_PENDING_KEY);
    signOut();
    setStep("password");
    setCode("");
  };

  const submitCode = async () => {
    setBusy(true);
    try {
      const res = await verify({ data: { code: code.trim() } });
      if (!res.ok) {
        setError(res.error ?? "That code is invalid.");
        return;
      }
      localStorage.removeItem(TWO_FACTOR_PENDING_KEY);
      toast.success("Signed in");
      void navigate({ to: "/dashboard" });
    } catch {
      setError("Could not verify that code.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "code") {
    return (
      <AuthLayout
        title="Enter your code"
        subtitle={maskedEmail ? `We emailed a 6-digit code to ${maskedEmail}.` : "We emailed you a 6-digit code."}
        footer={
          <button type="button" onClick={cancel} className="text-primary hover:underline">
            Use a different account
          </button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            void submitCode();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="text-center font-mono text-lg tracking-[0.4em]"
            />
            <p className="text-xs text-muted-foreground">A backup code works too.</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-1.5" disabled={busy || code.trim().length < 4}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            Verify and continue
          </Button>
          <button
            type="button"
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const res = await resend({ data: { purpose: "login" } });
              if (res.ok) toast.success("New code sent.");
              else toast.error(res.error ?? "Could not send a new code.");
            }}
          >
            Send a new code
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue building."
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (!email.includes("@") || password.length < 6) {
            setError("Enter a valid email and a password of at least 6 characters.");
            return;
          }
          const { error: err } = await signIn(email, password);
          if (err) {
            setError(err);
            return;
          }
          try {
            const res = await challenge();
            if (res.required) {
              localStorage.setItem(TWO_FACTOR_PENDING_KEY, "1");
              setMaskedEmail(res.email ?? null);
              setStep("code");
              if (!res.sent) setError(res.error ?? "We could not email your code. Use a backup code instead.");
              return;
            }
          } catch {
            /* two-factor check unavailable — continue */
          }
          toast.success("Signed in");
          void navigate({ to: "/dashboard" });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
        <GoogleButton label="Continue with Google" />
        <DiscordButton label="Continue with Discord" />
        <Link to="/forgot-password" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  );
}
