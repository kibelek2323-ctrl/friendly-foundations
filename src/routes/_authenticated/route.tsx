import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getTwoFactorGate } from "@/lib/twofa.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    // A valid session is not enough: accounts with email two-factor must have
    // completed the code for this exact session (enforced server-side too).
    const gate = await getTwoFactorGate();
    if (gate.required) throw redirect({ to: "/login" });

    return { user: data.user };
  },
  component: () => <Outlet />,
});
