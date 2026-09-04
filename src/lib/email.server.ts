/** Server-only transactional email helper (Lovable managed email). */
import { sendLovableEmail } from "@lovable.dev/email-js";

const FROM = "Bottly <auth@bottly.xyz>";
const SENDER_DOMAIN = "notify.bottly.xyz";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendTransactionalEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Email delivery is not configured yet.");

  await sendLovableEmail(
    {
      to,
      from: FROM,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      purpose: "transactional",
      label: "bottly-auth",
    },
    { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
  );
}

/** Modern, brand-styled shell used by all Bottly transactional emails. */
export function emailShell(options: { heading: string; intro: string; body: string; footer?: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#0b0b12;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#12121c;border:1px solid #232338;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px;background:linear-gradient(135deg,#5865F2 0%,#8B5CF6 100%);">
          <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.75);">Bottly</div>
          <div style="margin-top:6px;font-size:22px;font-weight:700;color:#ffffff;">${options.heading}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;color:#c9c9dd;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 20px;">${options.intro}</p>
          ${options.body}
          <p style="margin:24px 0 0;font-size:13px;color:#7d7d99;">${options.footer ?? "If you did not request this, you can safely ignore this email."}</p>
        </td>
      </tr>
    </table>
    <p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:12px;color:#5c5c78;">bottly.xyz</p>
  </body>
</html>`;
}

export function otpEmailHtml(code: string): string {
  return emailShell({
    heading: "Your sign-in code",
    intro: "Use the code below to finish signing in to your Bottly account. It expires in 10 minutes.",
    body: `<div style="margin:8px 0;padding:18px;border-radius:16px;background:#1b1b2b;border:1px solid #2c2c44;text-align:center;font-size:32px;letter-spacing:.36em;font-weight:700;color:#ffffff;">${code}</div>`,
    footer: "If you did not try to sign in, change your password right away.",
  });
}
