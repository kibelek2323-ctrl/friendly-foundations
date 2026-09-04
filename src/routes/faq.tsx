import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicShell } from "@/components/layout/PublicShell";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "Discord Bot Builder FAQ — Bottly" },
    { name: "description", content: "Answers about building, running and buying Discord bots with Bottly." },
    { property: "og:title", content: "Discord Bot Builder FAQ — Bottly" },
    { property: "og:description", content: "Answers about building, running and buying Discord bots with Bottly." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bottly.xyz/faq" },
  ],
  links: [{ rel: "canonical", href: "https://bottly.xyz/faq" }],
  scripts: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }),
    },
  ] }),
  component: Page,
});

const questions = [
  ["Do I need to know how to code?", "No. Bottly gives you visual editors for messages, slash commands, components and automation flows."],
  ["How do I connect my Discord bot?", "Create an application in Discord, add its bot token in Bottly Settings, then use the generated invite link to add it to your server."],
  ["Can Bottly run my bot?", "Yes. Once a valid token is connected, runtime controls let you start, stop and monitor the bot from the dashboard."],
  ["What can I buy in the marketplace?", "Marketplace listings are complete bot snapshots. After purchase, the bot appears in your workspace and its appearance can be customised."],
  ["How does marketplace balance work?", "Balance is displayed in USD. Redeem a balance code on the Balance page, then use those funds for marketplace purchases."],
  ["Are uploaded screenshots public?", "Marketplace screenshots are stored privately and delivered through time-limited links when a published listing is viewed."],
  ["What happens to my bot token?", "Tokens are verified and encrypted on the server. They are never returned to your browser after being saved."],
];

function Page() {
  return <PublicShell><div className="mx-auto max-w-3xl px-4 py-16">
    <p className="text-sm font-medium text-primary">Help center</p>
    <h1 className="mt-2 text-3xl font-semibold">Frequently asked questions</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Quick answers about creating, publishing and running your Discord bots.</p>
    <Accordion type="single" collapsible className="mt-10 border-y border-border">
      {questions.map(([question, answer], index) => <AccordionItem key={question} value={`item-${index}`}>
        <AccordionTrigger className="text-left">{question}</AccordionTrigger>
        <AccordionContent className="leading-relaxed text-muted-foreground">{answer}</AccordionContent>
      </AccordionItem>)}
    </Accordion>
  </div></PublicShell>;
}