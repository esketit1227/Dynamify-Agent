/**
 * Agent C — Company Researcher.
 *
 * Builds an understanding of the prospect's target customers, product,
 * industries/use cases, positioning, business model, offers, and customer
 * language. Prefers the company's own site (already captured by the
 * Website Explorer) and uses hosted web search only to fill gaps or
 * corroborate. Every important claim must carry a source.
 */
import { runStructured } from "./openai-client";
import { companyResearchOutput, type CompanyResearchOutput } from "./schemas";
import type { ExploredPage } from "./website-explorer";

export interface CompanyResearcherInput {
  companyName: string;
  domain: string;
  pages: Pick<ExploredPage, "url" | "pageType" | "title" | "textContent">[];
}

const INSTRUCTIONS = `You are the Company Researcher agent for Dynamify Scout, an internal
tool that prepares outbound sales research for Dynamify (autonomous website
personalization software).

You are given the text content of pages already captured from the prospect's own
website. Use that as your primary, most-trusted source. You may also use web search
to corroborate or fill gaps (e.g. company size, funding, recent news) — but the
prospect's own site is authoritative for what they say about their product and
customers.

Determine: their product, the industries/use cases/audiences they serve, their
positioning, business model, major offers, and the language customers/the company use
to describe needs and outcomes.

CRITICAL — never invent facts. For every entry in "findings", classify it:
- "observed": stated directly on a page you were given (cite that page's URL and quote
  or closely paraphrase the evidence).
- "strong_inference": not stated directly, but clearly implied by multiple observed
  signals (explain the reasoning in evidenceSnippet, sourceUrl may be null if it's a
  synthesis rather than a single citation).
- "hypothesis": plausible but unverified — label it as such, do not present it as fact
  elsewhere in your output.

Never invent customer names, revenue, traffic, technology stack, testimonials, or
statistics that are not visible in the given pages or returned by search.`;

export async function researchCompany(
  input: CompanyResearcherInput,
): Promise<CompanyResearchOutput> {
  const { data } = await runStructured({
    tier: "research",
    name: "company_research",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      domain: input.domain,
      capturedPages: input.pages.map((p) => ({
        url: p.url,
        pageType: p.pageType,
        title: p.title,
        text: p.textContent.slice(0, 8000),
      })),
    }),
    schema: companyResearchOutput,
    enableWebSearch: true,
    temperature: 0.3,
  });
  return data;
}
