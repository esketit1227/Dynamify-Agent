/**
 * Agent E — Conversion Analyst.
 *
 * Scores the prospect's primary conversion-relevant page (usually the
 * homepage) against the Dynamify scoring framework, 100 points across seven
 * weighted categories. This is a CRO score, not a personalization score —
 * personalization potential is Agent F's job.
 */
import { runStructured } from "./openai-client";
import { conversionScoreOutput, type ConversionScoreOutput } from "./schemas";
import type { ExploredPage } from "./website-explorer";

export interface ConversionAnalystInput {
  companyName: string;
  targetPage: Pick<ExploredPage, "url" | "title" | "textContent">;
  /** Additional pages for context (e.g. to judge whether proof/CTAs are consistent site-wide). */
  supportingPages: Pick<ExploredPage, "url" | "pageType" | "title" | "textContent">[];
}

const INSTRUCTIONS = `You are the Conversion Analyst agent for Dynamify Scout. Score the
given target page (usually the homepage) using the Dynamify scoring framework, exactly
as specified — do not invent additional categories or change the point values:

- Value Proposition (0-20): Can the visitor quickly understand what the company does,
  who it's for, and why it matters?
- Audience Clarity (0-15): Does the site clearly communicate specific audience/use-case
  relevance, or is messaging generic/one-size-fits-all?
- Proof (0-15): Is useful trust/proof (logos, testimonials, case studies, data) visible
  at the right moment in the visitor's path?
- CTA (0-10): Is the intended action obvious and appropriate for the visitor's likely
  intent?
- Friction (0-15): Are there barriers to comprehension or action (score HIGH for LOW
  friction; a confusing, cluttered, or slow-feeling page scores low here)?
- Offer (0-10): Is there a compelling reason to continue or convert right now?
- Message Match (0-15): Could the experience better match likely visitor
  intent/source/audience — i.e. is there an obvious personalization gap?

Score strictly from the given page content — you are not browsing live, so judge only
what's in the text/structure you were given plus the supporting pages for context on
consistency. Write a concrete, specific explanation for every category: name what you
saw (or didn't see), not generic CRO platitudes. A weak explanation like "improve the
CTA" is not acceptable — explain what's wrong, for whom, and why it matters, per the
Scout product principles.`;

export async function analyzeConversion(
  input: ConversionAnalystInput,
): Promise<ConversionScoreOutput> {
  const { data } = await runStructured({
    tier: "research",
    name: "conversion_analysis",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      targetPage: {
        url: input.targetPage.url,
        title: input.targetPage.title,
        text: input.targetPage.textContent.slice(0, 10_000),
      },
      supportingPages: input.supportingPages.map((p) => ({
        url: p.url,
        pageType: p.pageType,
        title: p.title,
        text: p.textContent.slice(0, 3000),
      })),
    }),
    schema: conversionScoreOutput,
    temperature: 0.2,
  });
  return data;
}
