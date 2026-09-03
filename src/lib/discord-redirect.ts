/**
 * Discord requires an exact match with a Redirect URI registered in the
 * Developer Portal. The registered one is the published app URL, so we always
 * use it (regardless of preview/production origin).
 */
export const DISCORD_REDIRECT_URI = "https://bottly-bot-builder.lovable.app/auth/discord/callback";
