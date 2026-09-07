/**
 * Agent D — Competitor Researcher.
 *
 * Identifies 3-5 relevant competitors/alternatives and compares their
 * positioning, audience specificity, proof, CTAs, offers, and
 * personalization. The point is not a broad competitive landscape report —
 * it's to surface gaps Dynamify can credibly point to in outreach.
 */
import { runStructured } from "./openai-client";
import { competitorResearchOutput, type CompetitorResearchOutput } from "./schemas";
import type { CompanyResearchOutput } from "./schemas";

export interface CompetitorResearcherInput {
  companyName: string;
  domain: string;
  companyResearch: Pick<
    CompanyResearchOutput,
    "summary" | "product" | "industriesServed" | "useCases" | "positioning" | "competitorsMentioned"
  >;
}

const INSTRUCTIONS = `You are the Competitor Researcher agent for Dynamify Scout.

Identify 3-5 real, currently-operating competitors or alternatives to the prospect
company, using web search. Prefer competitors the company itself references if any
were mentioned; otherwise use search to find plausible alternatives serving the same
market. Visit/consider each competitor's own site via search results and summarize:
value proposition, positioning, how specifically they address different audiences,
their CTAs, proof elements, industry/use-case segmentation, offers, any evidence of
personalization, and general website experience notes.

Then produce a short list of gaps relevant to Dynamify: places where competitors are
notably more (or less) audience-specific or personalized than the prospect, that would
be useful context for a Dynamify sales conversation. Do not write a general competitive
landscape report — stay focused on what's useful for that purpose.

Never invent a competitor's facts. If you cannot find a specific competitor with
confidence, include fewer than 5 rather than fabricating one.`;

export async function researchCompetitors(
  input: CompetitorResearcherInput,
): Promise<CompetitorResearchOutput> {
  const { data } = await runStructured({
    tier: "research",
    name: "competitor_research",
    instructions: INSTRUCTIONS,
    input: JSON.stringify(input),
    schema: competitorResearchOutput,
    enableWebSearch: true,
    temperature: 0.4,
  });
  return data;
}
