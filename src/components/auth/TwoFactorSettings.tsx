import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Loader2, Mail, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { disableTwoFactor, enableTwoFactor, getTwoFactorStatus, sendTwoFactorCode } from "@/lib/twofa.functions";

export function TwoFactorSettings() {
  const fetchStatus = useServerFn(getTwoFactorStatus);
  const sendCode = useServerFn(sendTwoFactorCode);
  const enable = useServerFn(enableTwoFactor);
  const disable = useServerFn(disableTwoFactor);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["two-factor"], queryFn: () => fetchStatus() });

  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const request = async () => {
    setSending(true);
    try {
      const res = await sendCode({ data: { purpose: data?.enabled ? "disable" : "enable" } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not send the code.");
        return;
      }
      setAwaiting(true);
      toast.success(`Code sent to ${res.email ?? "your email"}.`);
    } catch {
      toast.error("Could not send the code.");
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      if (data?.enabled) {
        const res = await disable({ data: { code: code.trim() } });
        if (!res.ok) {
          toast.error(res.error ?? "Invalid code.");
          return;
        }
        toast.success("Two-factor authentication turned off.");
      } else {
        const res = await enable({ data: { code: code.trim() } });
        if (!res.ok) {
          toast.error(res.error ?? "Invalid code.");
          return;
        }
        setBackupCodes(res.backupCodes ?? []);
        toast.success("Two-factor authentication is on.");
      }
      setCode("");
      setAwaiting(false);
      void refetch();
    } catch {
      toast.error("Could not update two-factor authentication.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {data?.enabled ? (
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          ) : (
            <ShieldOff className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          Two-factor authentication
        </h2>
        <Badge variant={data?.enabled ? "default" : "secondary"} className="ml-auto">
          {isLoading ? "…" : data?.enabled ? "On" : "Off"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        We email a 6-digit code from auth@bottly.xyz every time you sign in with your password.
        {data?.enabled ? ` ${data.backupCodesLeft} backup codes left.` : ""}
      </p>

      {backupCodes && (
        <div className="space-y-2 rounded-lg border border-border bg-elevated p-3">
          <p className="text-sm font-medium">Save your backup codes</p>
          <p className="text-xs text-muted-foreground">Each one works once if you lose access to your inbox.</p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(backupCodes.join("\n"));
              toast.success("Backup codes copied.");
            }}
          >
            <Copy className="size-4" aria-hidden="true" /> Copy codes
          </Button>
        </div>
      )}

      {awaiting ? (
        <div className="space-y-2">
          <Label htmlFor="tf-code">Email code</Label>
          <div className="flex gap-2">
            <Input
              id="tf-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="123456"
              inputMode="numeric"
              className="max-w-[180px] font-mono tracking-[0.3em]"
            />
            <Button disabled={busy || code.trim().length < 4} onClick={() => void confirm()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : data?.enabled ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant={data?.enabled ? "outline" : "default"} className="gap-1.5" disabled={sending} onClick={() => void request()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" aria-hidden="true" />}
          {data?.enabled ? "Turn off two-factor" : "Email me a code to turn it on"}
        </Button>
      )}
    </div>
  );
}
