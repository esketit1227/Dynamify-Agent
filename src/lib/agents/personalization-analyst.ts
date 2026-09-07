/**
 * Agent F — Personalization Analyst.
 *
 * Evaluates how much the prospect's visitor base likely varies along the
 * eight diversity dimensions in the spec, and translates that into a
 * personalization potential score, top opportunity candidates, and
 * recommended visitor segments — each labeled by how detectable it would
 * actually be in production (directly detectable / inferable / requires
 * enrichment / requires declared information). This agent does NOT pick the
 * single primary opportunity; that's a separate selection step so the
 * criteria in spec 1.3 (evidence, commercial meaningfulness, demonstrability,
 * Dynamify alignment, plausibility) are applied explicitly.
 */
import { runStructured } from "./openai-client";
import { personalizationAnalysisOutput, type PersonalizationAnalysisOutput } from "./schemas";
import type { CompanyResearchOutput, CompetitorResearchOutput } from "./schemas";
import type { ExploredPage } from "./website-explorer";

export interface PersonalizationAnalystInput {
  companyName: string;
  companyResearch: CompanyResearchOutput;
  competitorResearch: CompetitorResearchOutput;
  pages: Pick<ExploredPage, "url" | "pageType" | "title" | "textContent">[];
}

const INSTRUCTIONS = `You are the Personalization Analyst agent for Dynamify Scout.

Dynamify dynamically changes a website's copy, imagery, proof, product emphasis, CTAs,
examples, and offers based on recognized visitor signals. Your job is to assess how
much this prospect's visitor base plausibly varies along eight dimensions, using only
the company research, competitor research, and captured page content you're given:

1. Audience diversity — distinct buyer types (e.g. SMB vs enterprise, different job
   functions as buyers)
2. Industry diversity — multiple industries/verticals served
3. Use-case diversity — different buyers using the product for different jobs-to-be-done
4. Role diversity — different job roles caring about different benefits/features
5. Intent diversity — visitors arriving with materially different intents (research vs.
   ready-to-buy, evaluating vs. renewing, etc.)
6. Geographic diversity — country/region-driven differences that would change the ideal
   experience (currency, compliance, localized proof, etc.)
7. Product/category diversity — interest in different products/categories requiring
   different messaging
8. Acquisition-source diversity — campaign/referrer context that could plausibly change
   what a visitor needs to see

For each dimension, judge "present" conservatively based on real evidence (industries
actually listed, case studies actually shown, pricing tiers actually differentiated,
etc.) — do not assume diversity exists just because it's common in SaaS.

Do NOT assume every signal can be perfectly identified in production. Every
topOpportunity and recommendedSegment must be labeled with a detectability:
- directly_detectable: obvious from URL/referrer/on-page declared choice (e.g. an
  explicit industry picker, UTM campaign, geo-IP)
- inferable: derivable with reasonable confidence from behavior or content interacted
  with, but not directly declared
- requires_enrichment: would need a third-party data enrichment source (firmographic,
  intent data, etc.)
- requires_declared_information: only knowable if the visitor tells you (a form, a
  chat answer)

personalizationPotentialScore (0-100) should reflect how strong and easy-to-demonstrate
the overall personalization opportunity is — not just how many dimensions are
technically present, but how commercially meaningful and visually demonstrable they'd
be in a before/after demo.

Never invent evidence. Every entry's evidence array must trace to something in the
provided research/pages.`;

export async function analyzePersonalization(
  input: PersonalizationAnalystInput,
): Promise<PersonalizationAnalysisOutput> {
  const { data } = await runStructured({
    tier: "research",
    name: "personalization_analysis",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      companyResearch: input.companyResearch,
      competitorResearch: input.competitorResearch,
      pages: input.pages.map((p) => ({
        url: p.url,
        pageType: p.pageType,
        title: p.title,
        text: p.textContent.slice(0, 4000),
      })),
    }),
    schema: personalizationAnalysisOutput,
    temperature: 0.3,
  });
  return data;
}
