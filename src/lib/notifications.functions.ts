import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listActiveAnnouncements } from "@/lib/announcements.functions";

export type NotificationKind = "announcement" | "purchase" | "sale" | "bot_status" | "bot_error" | "system";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

type NotificationRow = {
  id: string;
  kind: Exclude<NotificationKind, "announcement">;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    const [announcements, notificationsResult, readsResult] = await Promise.all([
      listActiveAnnouncements(),
      context.supabase
        .from("user_notifications")
        .select("id, kind, title, body, href, read_at, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", context.userId),
    ]);

    if (notificationsResult.error) throw new Error(notificationsResult.error.message);
    if (readsResult.error) throw new Error(readsResult.error.message);

    const readAnnouncements = new Set((readsResult.data ?? []).map((row) => row.announcement_id));
    const systemItems = ((notificationsResult.data ?? []) as NotificationRow[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      read: Boolean(row.read_at),
      createdAt: row.created_at,
    }));
    const announcementItems: NotificationItem[] = announcements.map((announcement) => ({
      id: `announcement:${announcement.id}`,
      kind: "announcement",
      title: announcement.title,
      body: announcement.body,
      href: announcement.ctaUrl,
      read: readAnnouncements.has(announcement.id),
      createdAt: announcement.createdAt,
    }));

    return [...announcementItems, ...systemItems]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  });

const markInput = z.object({ id: z.string().min(1) });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => markInput.parse(data))
  .handler(async ({ data, context }) => {
    if (data.id.startsWith("announcement:")) {
      const announcementId = data.id.slice("announcement:".length);
      const { error } = await context.supabase.from("announcement_reads").upsert({
        user_id: context.userId,
        announcement_id: announcementId,
        read_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const announcements = await listActiveAnnouncements();
    const [{ error: notificationError }, { error: announcementError }] = await Promise.all([
      context.supabase
        .from("user_notifications")
        .update({ read_at: now })
        .eq("user_id", context.userId)
        .is("read_at", null),
      context.supabase.from("announcement_reads").upsert(
        announcements.map((announcement) => ({
          user_id: context.userId,
          announcement_id: announcement.id,
          read_at: now,
        })),
      ),
    ]);
    if (notificationError) throw new Error(notificationError.message);
    if (announcementError) throw new Error(announcementError.message);
    return { ok: true };
  });