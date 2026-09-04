import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, Rocket, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getMyProfile, updateMyProfile } from "@/lib/creators.functions";
import { instantiateTemplate, listPublicTemplates } from "@/lib/templates.functions";
import { applyReferralCode } from "@/lib/referrals.functions";
import { takePendingReferral } from "@/lib/referral-storage";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Bottly" },
      { name: "description", content: "Set up your Bottly profile and start from a ready-made Discord bot template." },
      { property: "og:title", content: "Get started — Bottly" },
      { property: "og:description", content: "Set up your Bottly profile and start from a ready-made Discord bot template." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STEPS = ["Your profile", "Pick a template", "You're set"] as const;

function Page() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const fetchTemplates = useServerFn(listPublicTemplates);
  const useTemplate = useServerFn(instantiateTemplate);
  const applyRef = useServerFn(applyReferralCode);

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["public-templates"],
    queryFn: () => fetchTemplates(),
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setUsername(profile.username ?? "");
    setBio(profile.bio);
  }, [profile]);

  useEffect(() => {
    const code = takePendingReferral();
    if (!code) return;
    void applyRef({ data: { code } })
      .then((res) => {
        if (res.ok) toast.success("Referral code applied.");
      })
      .catch(() => undefined);
  }, [applyRef]);

  const featured = useMemo(() => (templates ?? []).slice(0, 6), [templates]);

  const saveStepOne = async () => {
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
      const res = await saveProfile({
        data: { displayName: displayName.trim(), username: username.trim() || null, bio: bio.trim() },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save your profile.");
        return;
      }
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const pickTemplate = async (templateId: string) => {
    setBusy(true);
    try {
      const res = await useTemplate({ data: { templateId } });
      setFlowId(res.flowId);
      setStep(2);
      toast.success("Template copied to your workspace.");
    } catch {
      toast.error("Could not copy that template.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Get started">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Bottly</h1>
          <p className="text-sm text-muted-foreground">Three quick steps and your first bot is ready to edit.</p>
        </div>

        <ol className="flex flex-wrap items-center gap-3 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                  i < step && "border-success bg-success/15 text-success",
                  i === step && "border-primary bg-primary/15 text-primary",
                  i > step && "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn(i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < STEPS.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="panel space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <User className="size-4 text-primary" aria-hidden="true" /> Tell buyers who you are
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="o-name">Display name</Label>
              <Input id="o-name" maxLength={48} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-handle">Public handle</Label>
              <Input
                id="o-handle"
                maxLength={24}
                placeholder="botmaker"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-bio">Bio</Label>
              <Textarea
                id="o-bio"
                rows={3}
                maxLength={600}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I build moderation and ticketing bots."
              />
            </div>
            <div className="flex gap-2">
              <Button className="gap-1.5" disabled={busy} onClick={() => void saveStepOne()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" aria-hidden="true" />}
                Continue
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Skip
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="panel space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden="true" /> Start from a template
            </h2>
            {templatesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : featured.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates available yet — start from a blank flow.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void pickTemplate(t.id)}
                    className="rounded-xl border border-border bg-elevated p-4 text-left transition hover:border-primary/60"
                  >
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t.category}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Rocket className="size-4 text-success" aria-hidden="true" /> You&apos;re ready
            </h2>
            <p className="text-sm text-muted-foreground">
              {flowId
                ? "Your flow is in the builder. Connect a bot token and hit start whenever you're ready."
                : "Create a bot, design its flow, then connect a token to bring it online."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="gap-1.5" onClick={() => void navigate({ to: "/bots/new" })}>
                Create your bot <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" onClick={() => void navigate({ to: "/dashboard" })}>
                Go to dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
