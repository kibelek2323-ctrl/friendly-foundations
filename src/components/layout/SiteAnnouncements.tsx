import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listActiveAnnouncements, type Announcement } from "@/lib/announcements.functions";

const STORAGE_KEY = "bottly.dismissed-announcements";

function dismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function dismiss(id: string) {
  const next = Array.from(new Set([...dismissed(), id]));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const VARIANT_BAR: Record<Announcement["variant"], string> = {
  info: "bg-primary text-primary-foreground",
  success: "bg-success text-background",
  warning: "bg-warning text-background",
  promo: "bg-foreground text-background",
};

/** Renders the admin-managed announcement bar and entry popup. */
export function SiteAnnouncements() {
  const fetchAnnouncements = useServerFn(listActiveAnnouncements);
  const { data } = useQuery({
    queryKey: ["site-announcements"],
    queryFn: () => fetchAnnouncements(),
    staleTime: 60_000,
  });

  const [hidden, setHidden] = useState<string[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(dismissed());
    setReady(true);
  }, []);

  const bar = ready ? (data ?? []).find((a) => a.kind === "bar" && !hidden.includes(a.id)) : undefined;
  const popup = ready ? (data ?? []).find((a) => a.kind === "popup" && !hidden.includes(a.id)) : undefined;

  useEffect(() => {
    if (popup) setPopupOpen(true);
  }, [popup?.id]);

  const close = (a: Announcement) => {
    dismiss(a.id);
    setHidden((h) => [...h, a.id]);
  };

  return (
    <>
      {bar && (
        <div className={cn("relative px-4 py-2 text-center text-sm", VARIANT_BAR[bar.variant])}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
            <Megaphone className="size-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{bar.title}</span>
            {bar.body && <span className="opacity-90">{bar.body}</span>}
            {bar.ctaLabel && bar.ctaUrl && (
              <a href={bar.ctaUrl} className="font-semibold underline underline-offset-4">
                {bar.ctaLabel}
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => close(bar)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {popup && (
        <Dialog
          open={popupOpen}
          onOpenChange={(o) => {
            setPopupOpen(o);
            if (!o) close(popup);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{popup.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap">{popup.body}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {popup.ctaLabel && popup.ctaUrl ? (
                <Button asChild>
                  <a href={popup.ctaUrl}>{popup.ctaLabel}</a>
                </Button>
              ) : (
                <Button onClick={() => setPopupOpen(false)}>Got it</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
