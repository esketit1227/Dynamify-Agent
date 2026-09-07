/**
 * Internal Report — the human-readable analysis a Dynamify salesperson
 * reads before reaching out: why this company, what's wrong, what the
 * single primary opportunity is, and what the competitive/evidence context
 * is. This is internal-only; it is never sent to the prospect.
 */
import { runStructured } from "./openai-client";
import { reportOutput, type ReportOutput } from "./schemas";
import type {
  CompanyResearchOutput,
  CompetitorResearchOutput,
  ConversionScoreOutput,
  PersonalizationAnalysisOutput,
  OpportunitySelectionOutput,
} from "./schemas";

export interface ReportGeneratorInput {
  companyName: string;
  domain: string;
  companyResearch: CompanyResearchOutput;
  competitorResearch: CompetitorResearchOutput;
  conversionScore: ConversionScoreOutput;
  personalizationAnalysis: PersonalizationAnalysisOutput;
  primaryOpportunity: OpportunitySelectionOutput["candidates"][number];
}

const INSTRUCTIONS = `You are the Report Generator for Dynamify Scout. Write the internal
analysis report a Dynamify AE will read before reaching out to this prospect — never
content meant for the prospect themselves.

Sections:
- companyOverview: who they are, product, industries/use cases, positioning (from
  company research).
- conversionAnalysis: summarize the conversion score across all 7 categories with the
  most important 2-3 findings, in plain language.
- personalizationAnalysis: summarize personalization potential and the diversity
  dimensions that are actually present, with evidence.
- primaryOpportunity: the full "what's wrong / why it matters / who's affected /
  evidence / what should change / why personalization / what Dynamify would do"
  narrative for the one selected opportunity — this is the core of the report.
- competitorContext: 2-4 sentences on where competitors are ahead or behind on
  audience-specificity/personalization, only if genuinely useful context.
- recommendedNextSteps: what the AE should do — e.g. what to lead with in the outreach
  and the first call, and what to actually show live in the Dynamify demo once a
  meeting is booked (there is no pre-built preview; the demo is the real product
  running on the prospect's own site during that call).

evidenceAppendix should compile the most important sourced findings across all inputs
(observed/strong_inference/hypothesis), so a skeptical AE can check the work.

Every factual sentence must be traceable to the given research. Never introduce a new
fact that wasn't already present in company research, competitor research, conversion
analysis, or the opportunity.`;

export async function generateReport(input: ReportGeneratorInput): Promise<ReportOutput> {
  const { data } = await runStructured({
    tier: "writing",
    name: "internal_report",
    instructions: INSTRUCTIONS,
    input: JSON.stringify(input),
    schema: reportOutput,
    temperature: 0.4,
  });
  return data;
}
