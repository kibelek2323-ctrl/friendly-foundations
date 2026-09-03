import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteBotToken,
  getBotTokenStatus,
  setBotToken,
  type BotTokenStatus,
} from "@/lib/bot-token.functions";
import { inviteUrl } from "@/services/discord";
import type { Bot } from "@/types/bot";

const EMPTY_STATUS: BotTokenStatus = {
  hasToken: false,
  applicationId: null,
  verifiedAt: null,
  updatedAt: null,
};

function formatMoment(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

/**
 * Write-only token panel.
 *
 * The stored token is never sent to the browser, so there is nothing to reveal:
 * the user can replace it or delete it, and sees only public metadata
 * (application id, last verification time).
 */
export function BotConnectionPanel({
  bot,
  patch,
}: {
  bot: Bot;
  patch: (patch: Partial<Bot>) => void;
}) {
  const fetchStatus = useServerFn(getBotTokenStatus);
  const saveToken = useServerFn(setBotToken);
  const removeToken = useServerFn(deleteBotToken);

  const [status, setStatus] = useState<BotTokenStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus(null);
    setLoadFailed(false);

    void fetchStatus({ data: { botId: bot.id } })
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [bot.id, fetchStatus]);

  const applicationId = status?.applicationId ?? bot.applicationId ?? null;
  const invite = inviteUrl(applicationId);
  const verifiedAt = formatMoment(status?.verifiedAt ?? null);

  const save = async () => {
    const token = draft.trim();
    if (!token || saving) return;

    setSaving(true);
    try {
      const res = await saveToken({ data: { botId: bot.id, botName: bot.name, token } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save the token.");
        return;
      }

      setDraft("");
      if (res.status) {
        setStatus(res.status);
        patch({ applicationId: res.status.applicationId });
      }
      toast.success(
        res.discordUsername
          ? `Token verified — connected as ${res.discordUsername}`
          : "Token verified and stored securely",
      );
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await removeToken({ data: { botId: bot.id } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not remove the token.");
        return;
      }
      setStatus(EMPTY_STATUS);
      patch({ applicationId: null });
      toast.success("Token removed");
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const copyInvite = () => {
    if (!invite) return;
    void navigator.clipboard.writeText(invite);
    toast.success("Invite URL copied");
  };

  return (
    <section className="panel space-y-4 p-5">
      <h2 className="text-sm font-semibold">Connection</h2>

      <div className="space-y-2">
        <Label htmlFor="s-token">Bot token</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="s-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            placeholder={
              status?.hasToken
                ? "Paste a new token to replace the stored one"
                : "Paste your Discord bot token"
            }
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            className="font-mono"
            aria-describedby="s-token-help"
          />
          <Button
            onClick={() => void save()}
            disabled={saving || !draft.trim()}
            className="sm:w-32"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Verifying
              </>
            ) : status?.hasToken ? (
              "Replace"
            ) : (
              "Save token"
            )}
          </Button>
        </div>

        <p id="s-token-help" className="text-xs text-muted-foreground">
          The token is checked against Discord, then encrypted and stored on the server. It is never
          saved in this browser and never sent back to it.
        </p>

        <div aria-live="polite" className="min-h-5 text-xs">
          {status === null && !loadFailed && (
            <span className="text-muted-foreground">Checking token status…</span>
          )}
          {loadFailed && (
            <span className="text-destructive">
              Could not load the token status. Reload the page.
            </span>
          )}
          {status?.hasToken && (
            <span className="inline-flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
              Token stored
              {applicationId && <span className="font-mono">· app {applicationId}</span>}
              {verifiedAt && <span>· verified {verifiedAt}</span>}
            </span>
          )}
          {status !== null && !status.hasToken && !loadFailed && (
            <span className="text-muted-foreground">No token stored yet.</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s-invite">Invite URL</Label>
        {invite ? (
          <div className="flex gap-2">
            <Input id="s-invite" readOnly value={invite} className="font-mono text-xs" />
            <Button variant="outline" size="icon" aria-label="Copy invite URL" onClick={copyInvite}>
              <Copy className="size-4" />
            </Button>
            <Button variant="outline" size="icon" asChild aria-label="Open invite URL">
              <a href={invite} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        ) : (
          <p id="s-invite" className="text-xs text-muted-foreground">
            Save a verified token first — the invite URL needs the application id that Discord
            returns for it.
          </p>
        )}
      </div>

      {status?.hasToken && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRemove(true)}
            disabled={removing}
          >
            {removing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            Remove stored token
          </Button>
        </div>
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the stored token?</AlertDialogTitle>
            <AlertDialogDescription>
              {bot.name} will stop being able to connect to Discord until you paste a token again.
              The bot itself and its configuration are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={removing}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
