import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { startWorkspaceSync, stopWorkspaceSync, clearLocalWorkspace } from "@/lib/cloud-sync";

/** Keeps the auth store in sync with the backend session and mirrors data to the cloud. */
export function AuthBootstrap() {
  useEffect(() => {
    const setSession = useAuthStore.getState().setSession;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        void startWorkspaceSync(session.user.id);
      } else if (event === "SIGNED_OUT") {
        stopWorkspaceSync();
        clearLocalWorkspace();
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void startWorkspaceSync(data.session.user.id);
    });

    return () => {
      sub.subscription.unsubscribe();
      stopWorkspaceSync();
    };
  }, []);

  return null;
}
