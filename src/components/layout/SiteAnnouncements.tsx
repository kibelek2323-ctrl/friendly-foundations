import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { announcementIcon } from "@/lib/announcement-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { listActiveAnnouncements, type Announcement } from "@/lib/announcements.functions";

const STORAGE_KEY = "bottly.dismissed-announcements";
const SESSION_KEY = "bottly.session-shown-announcements";

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

function shownThisSession(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markShownThisSession(id: string) {
  const next = Array.from(new Set([...shownThisSession(), id]));
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

const VARIANT_BAR: Record<Announcement["variant"], string> = {
  info: "bg-primary text-primary-foreground",
  success: "bg-success text-background",
  warning: "bg-warning text-background",
  promo: "bg-foreground text-background",
  error: "bg-destructive text-destructive-foreground",
};

const VARIANT_ICON_STYLE: Record<Announcement["variant"], string> = {
  info: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  promo: "bg-foreground/10 text-foreground",
  error: "bg-destructive/15 text-destructive",
};

const VARIANT_ACCENT: Record<Announcement["variant"], string> = {
  info: "from-primary/25",
  success: "from-success/25",
  warning: "from-warning/25",
  promo: "from-foreground/15",
  error: "from-destructive/25",
};

/** Renders the admin-managed announcement bar and entry popup. */
export function SiteAnnouncements() {
  const fetchAnnouncements = useServerFn(listActiveAnnouncements);
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ["site-announcements"],
    queryFn: () => fetchAnnouncements(),
    staleTime: 60_000,
  });

  const [hidden, setHidden] = useState<string[]>([]);
  const [sessionShown, setSessionShown] = useState<string[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(dismissed());
    setSessionShown(shownThisSession());
    setReady(true);
  }, []);

  const bar = ready ? (data ?? []).find((a) => a.kind === "bar" && !hidden.includes(a.id)) : undefined;

  // Logged-in users see the popup at most once per browser session;
  // guests see it until they dismiss it (persisted in localStorage).
  const popup = ready
    ? (data ?? []).find(
        (a) => a.kind === "popup" && !hidden.includes(a.id) && (!user || !sessionShown.includes(a.id)),
      )
    : undefined;

  useEffect(() => {
    if (popup) {
      setPopupOpen(true);
      if (user) {
        markShownThisSession(popup.id);
        setSessionShown((s) => (s.includes(popup.id) ? s : [...s, popup.id]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup?.id]);

  const close = (a: Announcement) => {
    dismiss(a.id);
    setHidden((h) => [...h, a.id]);
  };

  const PopupIcon = announcementIcon(popup?.icon);
  const BarIcon = announcementIcon(bar?.icon);

  return (
    <>
      {bar && (
        <div className={cn("relative px-4 py-2 text-center text-sm", VARIANT_BAR[bar.variant])}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
            <BarIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{bar.title}</span>
            {bar.body && <span className="opacity-90">{bar.body}</span>}
            {bar.ctaLabel && bar.ctaUrl && (
              <a href={bar.ctaUrl} className="font-semibold underline underline-offset-4">
                {bar.ctaLabel}
              </a>
            )}
          </div>
          {bar.dismissible && (
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => close(bar)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
          )}
        </div>
      )}

      {popup && (
        <Dialog
          open={popupOpen}
          onOpenChange={(o) => {
            if (!popup.dismissible) return;
            setPopupOpen(o);
            if (!o && !user) close(popup);
          }}
        >
          <DialogContent
            className={cn(
              "overflow-hidden rounded-3xl border-border/60 p-0 shadow-2xl sm:max-w-md",
              "[&>button]:rounded-full [&>button]:bg-background/60 [&>button]:p-1 [&>button]:opacity-80 hover:[&>button]:opacity-100",
              !popup.dismissible && "[&>button]:hidden",
            )}
          >
            <div className={cn("bg-gradient-to-b to-transparent px-6 pt-8 pb-5", VARIANT_ACCENT[popup.variant])}>
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl shadow-sm",
                  VARIANT_ICON_STYLE[popup.variant],
                )}
              >
                <PopupIcon className="size-6" aria-hidden="true" />
              </div>
              <DialogTitle className="mt-4 text-lg font-semibold tracking-tight">{popup.title}</DialogTitle>
              <DialogDescription className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {popup.body}
              </DialogDescription>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              {popup.dismissible && (
                <Button variant="ghost" onClick={() => setPopupOpen(false)}>
                  Later
                </Button>
              )}
              {popup.ctaLabel && popup.ctaUrl ? (
                <Button asChild className="rounded-full px-5">
                  <a href={popup.ctaUrl}>{popup.ctaLabel}</a>
                </Button>
              ) : (
                <Button onClick={() => setPopupOpen(false)} className="rounded-full px-5">
                  Got it
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
