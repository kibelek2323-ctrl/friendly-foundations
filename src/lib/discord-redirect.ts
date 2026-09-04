/**
 * Discord requires an exact match with a Redirect URI registered in the
 * Developer Portal. Use the published custom domain so the callback lands
 * on the live app (preview cannot be used because Discord checks the URI).
 */
export const DISCORD_REDIRECT_URI = "https://bottly.xyz/auth/discord/callback";
