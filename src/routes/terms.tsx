import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service — Bottly" },
    { name: "description", content: "Terms governing accounts, bot content, marketplace purchases and use of Bottly." },
    { property: "og:title", content: "Terms of Service — Bottly" },
    { property: "og:description", content: "Terms governing accounts, bot content, marketplace purchases and use of Bottly." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Page,
});

const sections = [
  ["Using Bottly", "You must use Bottly and connected Discord services lawfully, follow Discord's rules, and keep your account credentials secure."],
  ["Your bots and content", "You retain responsibility for the bots, messages, media and automations you create. Do not upload content you do not have permission to use."],
  ["Marketplace", "Sellers must accurately describe listings and own the content they publish. Purchases grant use of the delivered bot configuration; they do not transfer unrelated intellectual-property rights."],
  ["Balance and payments", "Marketplace balance is denominated in USD and may be added using authorised codes. Unless required by law, redeemed codes and completed digital deliveries are final."],
  ["Availability", "We work to keep the service available but may suspend features for maintenance, security, legal compliance or abuse prevention."],
  ["Account enforcement", "We may restrict or close accounts that misuse the service, compromise other users, violate applicable law or repeatedly breach these terms."],
  ["Liability", "Bottly is provided as available. To the extent permitted by law, we are not responsible for indirect loss caused by third-party services, user-created bots or service interruptions."],
];

function Page() {
  return <PublicShell><article className="mx-auto max-w-3xl px-4 py-16">
    <p className="text-sm font-medium text-primary">Legal</p>
    <h1 className="mt-2 text-3xl font-semibold">Terms of Service</h1>
    <p className="mt-3 text-sm text-muted-foreground">Effective September 3, 2026</p>
    <div className="mt-10 space-y-8">
      {sections.map(([title, body], index) => <section key={title}>
        <h2 className="text-lg font-semibold">{index + 1}. {title}</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
      </section>)}
    </div>
  </article></PublicShell>;
}