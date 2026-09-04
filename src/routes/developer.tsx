import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Code2, Coins, FileCode, Github, Loader2, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { myDeveloperApplication, submitDeveloperApplication } from "@/lib/developer-applications.functions";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Apply as a developer — Bottly" },
      {
        name: "description",
        content: "Tell us about your experience, your AI workflow and your projects to become a Bottly marketplace developer.",
      },
      { property: "og:title", content: "Apply as a developer — Bottly" },
      {
        property: "og:description",
        content: "Tell us about your experience, your AI workflow and your projects to become a Bottly marketplace developer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const PERKS = [
  { icon: Code2, title: "Publish on the marketplace", body: "Package your bots and templates and list them for the whole Bottly community." },
  { icon: Coins, title: "Earn and cash out", body: "Set your own price in USD and request a payout of everything you earned." },
  { icon: BadgeCheck, title: "Developer badge", body: "A visible badge on your public profile so buyers know who they are buying from." },
];

function Page() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.session));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PublicShell>
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-sm font-medium text-primary">Become a developer</p>
          <h1 className="mt-2 text-3xl font-semibold">Build bots other communities actually run</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bottly developers publish bots, templates and configurable projects on the marketplace. Tell us about your
            experience and how you work — we review every application by hand.
          </p>
          <ul className="mt-9 grid gap-4 md:grid-cols-3">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-lg border border-border bg-background p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-4 text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-14">
        {signedIn === null && (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {signedIn === false && (
          <div className="rounded-lg border border-border bg-surface/50 p-8 text-center">
            <Sparkles className="mx-auto size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Sign in to apply</h2>
            <p className="mt-2 text-sm text-muted-foreground">You need a Bottly account before sending an application.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
          </div>
        )}
        {signedIn === true && <ApplicationForm />}
      </div>
    </PublicShell>
  );
}

function ApplicationForm() {
  const load = useServerFn(myDeveloperApplication);
  const submit = useServerFn(submitDeveloperApplication);

  const existing = useQuery({
    queryKey: ["my-developer-application"],
    queryFn: () => load(),
  });

  const [experience, setExperience] = useState("");
  const [aiUsage, setAiUsage] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [motivation, setMotivation] = useState("");
  const [saving, setSaving] = useState(false);

  const current = existing.data;

  const send = async () => {
    setSaving(true);
    try {
      await submit({ data: { experience, aiUsage, portfolioUrl, githubUrl, motivation } });
      toast.success("Application sent — we'll get back to you soon");
      void existing.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your application");
    } finally {
      setSaving(false);
    }
  };

  if (existing.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (current && current.status !== "rejected") {
    return (
      <div className="rounded-lg border border-border bg-surface/50 p-8">
        <Badge variant={current.status === "approved" ? "default" : "secondary"} className="capitalize">
          {current.status}
        </Badge>
        <h2 className="mt-3 text-lg font-semibold">
          {current.status === "approved" ? "You're a Bottly developer" : "Application under review"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {current.status === "approved"
            ? "Your application was approved. You can publish listings and request payouts."
            : "We received your application. You'll get a notification as soon as it's reviewed."}
        </p>
        {current.adminNote && <p className="mt-3 text-sm text-muted-foreground">Note: {current.adminNote}</p>}
        {current.status === "approved" && (
          <Button asChild className="mt-5">
            <Link to="/marketplace/publish">Publish your first bot</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Apply for developer access</h2>
        <p className="mt-1 text-sm text-muted-foreground">A few questions about you and how you build.</p>
      </div>

      {current?.status === "rejected" && current.adminNote && (
        <p className="rounded-md border border-border bg-surface/50 p-3 text-sm text-muted-foreground">
          Previous review note: {current.adminNote}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="experience">Your experience with bots and development</Label>
        <Textarea
          id="experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What have you built so far, which languages or tools do you use, how long have you been doing it?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai">How much do you use AI in your work?</Label>
        <Textarea
          id="ai"
          value={aiUsage}
          onChange={(e) => setAiUsage(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="e.g. I use AI for boilerplate and debugging, but I review and test everything myself."
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="portfolio">Portfolio link (optional)</Label>
          <Input
            id="portfolio"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            maxLength={300}
            placeholder="https://yoursite.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github" className="flex items-center gap-1.5">
            <Github className="size-3.5" aria-hidden="true" /> GitHub (optional)
          </Label>
          <Input
            id="github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            maxLength={300}
            placeholder="https://github.com/username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="motivation">Why do you want to sell on Bottly?</Label>
        <Textarea
          id="motivation"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What do you plan to publish and who is it for?"
          required
        />
      </div>

      <Button type="submit" disabled={saving} size="lg">
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Send application
      </Button>
    </form>
  );
}
