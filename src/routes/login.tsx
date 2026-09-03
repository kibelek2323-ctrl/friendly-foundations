import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { DiscordButton } from "@/components/auth/DiscordButton";
import { useAuthStore } from "@/stores/useAuthStore";

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
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
