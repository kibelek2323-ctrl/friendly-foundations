import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { exchangeDiscordCode } from "@/lib/discord.functions";
import { loginWithDiscord } from "@/lib/discord-auth.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/discord/callback")({
  component: DiscordCallback,
});

function isLoginState(state: string) {
  try {
    const parsed = JSON.parse(atob(state.replace(/-/g, "+").replace(/_/g, "/"))) as { m?: string };
    return parsed.m === "login";
  } catch {
    return false;
  }
}

function DiscordCallback() {
  const navigate = useNavigate();
  const exchange = useServerFn(exchangeDiscordCode);
  const login = useServerFn(loginWithDiscord);
  const [status, setStatus] = useState("Connecting to Discord…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const state = search.get("state");
    const error = search.get("error");

    if (error) {
      toast.error("Discord connection declined", { description: search.get("error_description") ?? error });
      void navigate({ to: "/login" });
      return;
    }

    if (!code || !state) {
      toast.error("Invalid Discord callback");
      void navigate({ to: "/login" });
      return;
    }

    if (isLoginState(state)) {
      setStatus("Signing you in with Discord…");
       login({ data: { code } })
        .then(async ({ email, username, tokenHash }) => {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: "email",
            token_hash: tokenHash,
          });
          if (otpError) throw otpError;
          setStatus(`Signed in as ${username}`);
          toast.success("Welcome back", { description: email });
          void navigate({ to: "/dashboard" });
        })
        .catch((e) => {
          toast.error("Discord sign-in failed", { description: e instanceof Error ? e.message : String(e) });
          void navigate({ to: "/login" });
        });
      return;
    }

    exchange({ data: { code, state } })
      .then(({ username }) => {
        setStatus(`Connected as ${username}`);
        toast.success("Discord connected", { description: `Linked account: @${username}` });
        setTimeout(() => navigate({ to: "/dashboard" }), 800);
      })
      .catch((e) => {
        toast.error("Could not connect Discord", { description: e instanceof Error ? e.message : String(e) });
        void navigate({ to: "/dashboard" });
      });
  }, [exchange, login, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
