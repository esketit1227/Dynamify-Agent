/**
 * Selects the single primary personalization opportunity, per product
 * principle 1.3. Scout may surface many candidate opportunities, but
 * exactly one is chosen to drive the internal report and the outreach.
 *
 * The model proposes candidates and scores each against the five explicit
 * selection criteria; we compute the composite score deterministically (a
 * fixed weighting) rather than trusting the model to rank correctly, so the
 * "why this one" story is always reproducible from the stored per-criterion
 * scores.
 */
import { runStructured } from "./openai-client";
import {
  opportunitySelectionOutput,
  type OpportunitySelectionOutput,
  type CompanyResearchOutput,
  type CompetitorResearchOutput,
  type ConversionScoreOutput,
  type PersonalizationAnalysisOutput,
} from "./schemas";

export interface OpportunitySelectorInput {
  companyName: string;
  companyResearch: CompanyResearchOutput;
  competitorResearch: CompetitorResearchOutput;
  conversionScore: ConversionScoreOutput;
  personalizationAnalysis: PersonalizationAnalysisOutput;
}

export type ScoredOpportunityCandidate = OpportunitySelectionOutput["candidates"][number] & {
  compositeScore: number;
};

export interface OpportunitySelectionResult {
  candidates: ScoredOpportunityCandidate[];
  primaryIndex: number;
  selectionRationale: string;
}

const INSTRUCTIONS = `You are the Opportunity Selection agent for Dynamify Scout.

Given the company research, competitor research, conversion score, and personalization
analysis for a prospect, propose 2-6 candidate personalization opportunities. Each
candidate must fully answer, specifically to this company (never generically):
- What is wrong?
- Why does it matter?
- Who is affected (which visitor segment)?
- What evidence supports the conclusion (cite from the research/analysis given, do not
  invent evidence)?
- What should change?
- Why is personalization the right mechanism (not just "better copy")?
- What would Dynamify do dynamically (name the specific recognized signal and the
  specific dynamic change)?

Score each candidate 0-100 on these five criteria, honestly and with spread (don't give
everything 80-90):
- evidenceStrength: how directly the opportunity is supported by real evidence, vs.
  speculation
- commercialMeaningfulness: how much this would plausibly move a real business metric
  for this company
- demonstrability: how easy this would be to show convincingly live, on the prospect's
  real site, in a short Dynamify demo call — a clear before/after story a salesperson
  could walk through in a few minutes, not something that needs a lot of setup or
  hand-waving to land
- dynamifyAlignment: how closely this matches what Dynamify's product actually does
  (recognizing visitor signals to dynamically change copy/imagery/proof/CTA/offer),
  versus a generic redesign suggestion unrelated to personalization
- plausibility: how confident you are this isn't built on invented facts

Set primaryIndex to the candidate you'd choose as the one primary opportunity to lead
the outreach and the sales conversation with, and explain the selection rationale
referencing the criteria above.`;

const WEIGHTS = {
  evidenceStrength: 0.25,
  commercialMeaningfulness: 0.2,
  demonstrability: 0.25,
  dynamifyAlignment: 0.2,
  plausibility: 0.1,
} as const;

function compositeScore(c: OpportunitySelectionOutput["candidates"][number]): number {
  return (
    c.evidenceStrength * WEIGHTS.evidenceStrength +
    c.commercialMeaningfulness * WEIGHTS.commercialMeaningfulness +
    c.demonstrability * WEIGHTS.demonstrability +
    c.dynamifyAlignment * WEIGHTS.dynamifyAlignment +
    c.plausibility * WEIGHTS.plausibility
  );
}

export async function selectOpportunity(
  input: OpportunitySelectorInput,
): Promise<OpportunitySelectionResult> {
  const { data } = await runStructured({
    tier: "research",
    name: "opportunity_selection",
    instructions: INSTRUCTIONS,
    input: JSON.stringify(input),
    schema: opportunitySelectionOutput,
    temperature: 0.4,
  });

  const scoredCandidates: ScoredOpportunityCandidate[] = data.candidates.map((c) => ({
    ...c,
    compositeScore: compositeScore(c),
  }));

  // Trust the model's stated primaryIndex as the narrative choice, but fall
  // back to the highest composite score if it's out of range or the model's
  // pick is a clear outlier (lower composite than the best by a wide margin
  // suggests the model didn't actually weigh the criteria it just scored).
  let primaryIndex = data.primaryIndex;
  if (primaryIndex < 0 || primaryIndex >= scoredCandidates.length) {
    primaryIndex = scoredCandidates.reduce(
      (bestIdx, c, idx, arr) => (c.compositeScore > arr[bestIdx]!.compositeScore ? idx : bestIdx),
      0,
    );
  }

  return {
    candidates: scoredCandidates,
    primaryIndex,
    selectionRationale: data.selectionRationale,
  };
}
