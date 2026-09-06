import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { amIAdmin } from "@/lib/admin-codes.functions";

/**
 * Renders admin pages only for verified administrators.
 * The check is server-side (`amIAdmin`); every admin server function also
 * re-verifies the role, so this is purely to avoid rendering the shell.
 */
export function AdminOnly({ title, children }: { title: string; children: ReactNode }) {
  const checkAdmin = useServerFn(amIAdmin);
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AppShell title={title}>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title={title}>
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to Bottly administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
