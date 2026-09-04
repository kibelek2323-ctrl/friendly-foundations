import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMyProfile, removeMyAvatar, updateMyProfile, uploadMyAvatar } from "@/lib/creators.functions";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";

export const Route = createFileRoute("/_authenticated/account-settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Bottly" },
      { name: "description", content: "Update your public Bottly creator name, handle and bio shown on the marketplace." },
      { property: "og:title", content: "Account settings — Bottly" },
      { property: "og:description", content: "Update your public Bottly creator name, handle and bio shown on the marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.displayName);
    setUsername(data.username ?? "");
    setBio(data.bio);
  }, [data]);

  const submit = async () => {
    if (displayName.trim().length < 2) {
      toast.error("Display name needs at least 2 characters.");
      return;
    }
    if (username && !/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
      toast.error("Handle must be 3-24 letters, numbers, _ or -.");
      return;
    }
    setBusy(true);
    try {
      const res = await save({
        data: { displayName: displayName.trim(), username: username.trim() || null, bio: bio.trim() },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save your profile.");
        return;
      }
      toast.success("Profile saved.");
      void refetch();
    } catch {
      toast.error("Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Account settings">
      <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            This is how buyers see you on the marketplace and on your public creator page.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="panel space-y-4 p-5">
            {data?.verified && (
              <p className="flex items-center gap-1.5 text-sm text-primary">
                <BadgeCheck className="size-4" aria-hidden="true" /> Verified creator
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="p-name">Display name</Label>
              <Input id="p-name" maxLength={48} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-handle">Public handle</Label>
              <Input
                id="p-handle"
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="botmaker"
              />
              <p className="text-xs text-muted-foreground">
                Your profile lives at /u/{username || "your-handle"}.
                {data?.username && (
                  <>
                    {" "}
                    <Link
                      to="/u/$username"
                      params={{ username: data.username }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      View <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  </>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-bio">Bio</Label>
              <Textarea
                id="p-bio"
                rows={4}
                maxLength={600}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell buyers what kind of bots you build."
              />
            </div>

            <Button className="gap-1.5" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden="true" />}
              Save profile
            </Button>
          </div>
        )}

        <TwoFactorSettings />
      </div>
    </AppShell>
  );
}
