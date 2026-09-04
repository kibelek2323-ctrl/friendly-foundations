import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { earnedBadges } from "./badges";

export interface CreatorProfile {
  id: string;
  displayName: string;
  username: string | null;
  bio: string;
  avatarUrl: string | null;
  verified: boolean;
  joinedAt: string;
  salesCount: number;
  listingCount: number;
  rating: number;
  reviewCount: number;
  badges: string[];
}

const HANDLE = z.object({ handle: z.string().min(1).max(64) });

/** Public creator profile, looked up by username or user id. */
export const getCreatorProfile = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => HANDLE.parse(data))
  .handler(async ({ data }): Promise<CreatorProfile | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.handle);

    const query = supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, bio, avatar_url, verified, created_at");
    const { data: profile } = isUuid
      ? await query.eq("id", data.handle).maybeSingle()
      : await query.ilike("username", data.handle).maybeSingle();
    if (!profile) return null;

    const { data: listings } = await supabaseAdmin
      .from("marketplace_listings")
      .select("id, sales_count")
      .eq("seller_id", profile.id)
      .eq("published", true);

    const listingIds = (listings ?? []).map((l) => l.id);
    const { data: reviews } = listingIds.length
      ? await supabaseAdmin.from("listing_reviews").select("rating").in("listing_id", listingIds)
      : { data: [] as { rating: number }[] };

    const total = (reviews ?? []).reduce((sum, r) => sum + r.rating, 0);
    const count = (reviews ?? []).length;

    const { data: granted } = await supabaseAdmin
      .from("profile_badges")
      .select("badge")
      .eq("user_id", profile.id);

    const stats = {
      salesCount: (listings ?? []).reduce((sum, l) => sum + (l.sales_count ?? 0), 0),
      listingCount: listingIds.length,
      rating: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
      reviewCount: count,
    };

    const manual = (granted ?? []).map((b) => b.badge);
    if (profile.verified && !manual.includes("verified")) manual.unshift("verified");

    return {
      id: profile.id,
      displayName: profile.display_name ?? "Bottly creator",
      username: profile.username ?? null,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatar_url ?? null,
      verified: profile.verified ?? false,
      joinedAt: profile.created_at,
      ...stats,
      badges: [...manual, ...earnedBadges(stats)],
    };
  });

export interface MyProfile {
  displayName: string;
  username: string | null;
  bio: string;
  avatarUrl: string | null;
  verified: boolean;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url, verified")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      displayName: data?.display_name ?? "",
      username: data?.username ?? null,
      bio: data?.bio ?? "",
      avatarUrl: data?.avatar_url ?? null,
      verified: data?.verified ?? false,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        displayName: z.string().min(2).max(48),
        username: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{3,24}$/, "Username must be 3-24 letters, numbers, _ or -.")
          .nullable()
          .default(null),
        bio: z.string().max(600).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        username: data.username,
        bio: data.bio,
      })
      .eq("id", context.userId);
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "That username is already taken." : "Could not save your profile.",
      };
    }
    return { ok: true };
  });

/** Signed avatar URLs are stored on the profile; 10-year expiry keeps them stable. */
const AVATAR_URL_TTL = 60 * 60 * 24 * 365 * 10;

export const uploadMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload.");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ avatarUrl: string }> => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload.");
    if (file.size > 2_000_000) throw new Error("The image is larger than 2 MB.");
    if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) throw new Error("Unsupported image format.");

    const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${context.userId}/avatar.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("avatars").upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(path, AVATAR_URL_TTL);
    if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "Could not sign the avatar.");

    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ avatar_url: signed.signedUrl })
      .eq("id", context.userId);
    if (updateError) throw new Error("Could not save the avatar to your profile.");
    return { avatarUrl: signed.signedUrl };
  });

export const removeMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", context.userId);
    if (error) throw new Error("Could not remove the avatar.");
    return { ok: true };
  });
