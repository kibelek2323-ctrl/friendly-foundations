import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicShell } from "@/components/layout/PublicShell";
import { getFaqContent, DEFAULT_FAQ } from "@/lib/site-content.functions";

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
        mainEntity: DEFAULT_FAQ.items.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }),
    },
  ] }),
  component: Page,
});

function Page() {
  const fetchFaq = useServerFn(getFaqContent);
  const { data } = useQuery({ queryKey: ["faq-content"], queryFn: () => fetchFaq() });
  const items = data?.items ?? DEFAULT_FAQ.items;

  return <PublicShell><div className="mx-auto max-w-3xl px-4 py-16">
    <p className="text-sm font-medium text-primary">Help center</p>
    <h1 className="mt-2 text-3xl font-semibold">Frequently asked questions</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Quick answers about creating, publishing and running your Discord bots.</p>
    <Accordion type="single" collapsible className="mt-10 border-y border-border">
      {items.map(({ question, answer }, index) => <AccordionItem key={question} value={`item-${index}`}>
        <AccordionTrigger className="text-left">{question}</AccordionTrigger>
        <AccordionContent className="leading-relaxed text-muted-foreground">{answer}</AccordionContent>
      </AccordionItem>)}
    </Accordion>
  </div></PublicShell>;
}
