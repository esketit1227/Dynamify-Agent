/**
 * Zod contracts for every agent in the Scout pipeline. These are passed to
 * `zodTextFormat` when calling the OpenAI Responses API so the model's
 * output is parsed straight into typed, validated objects — see
 * `src/lib/agents/openai-client.ts`.
 *
 * Enum value lists are imported from the Drizzle schema so the DB and the
 * model's structured output can never drift apart.
 */
import { z } from "zod";
import {
  detectabilityEnum,
  evidenceConfidenceEnum,
  opportunityTypeEnum,
  replySentimentEnum,
} from "@/lib/db/schema";

export const evidenceConfidence = z.enum(evidenceConfidenceEnum.enumValues);
export const detectability = z.enum(detectabilityEnum.enumValues);
export const opportunityType = z.enum(opportunityTypeEnum.enumValues);
export const replySentiment = z.enum(replySentimentEnum.enumValues);

/** A factual claim that must be traceable to a source — never invented. */
export const sourcedFinding = z.object({
  claim: z.string().min(1),
  sourceUrl: z.string().nullable(),
  evidenceSnippet: z.string().nullable(),
  confidence: evidenceConfidence,
});
export type SourcedFinding = z.infer<typeof sourcedFinding>;

// ---------------------------------------------------------------------------
// Agent A — ICP Qualifier
// ---------------------------------------------------------------------------

export const icpQualifierOutput = z.object({
  fitScore: z.number().int().min(0).max(100),
  fitReasons: z.array(z.string()).min(1),
  disqualifiers: z.array(z.string()),
  businessModel: z.string(),
  likelyWebsiteConversionObjective: z.string(),
  likelyDecisionMaker: z.string(),
  shouldAnalyze: z.boolean(),
});
export type IcpQualifierOutput = z.infer<typeof icpQualifierOutput>;

// ---------------------------------------------------------------------------
// Agent B — Website Explorer (structure comes from Playwright, but the model
// classifies discovered links against the page budget).
// ---------------------------------------------------------------------------

export const websitePageType = z.enum([
  "homepage",
  "product",
  "pricing",
  "industry_solution",
  "case_study",
  "contact_demo_checkout",
  "faq_resource",
  "other",
]);

export const linkClassification = z.object({
  url: z.string(),
  pageType: websitePageType,
  priority: z.number().int().min(0).max(100),
  whyRelevant: z.string(),
});

export const linkTriageOutput = z.object({
  rankedLinks: z.array(linkClassification),
  enoughEvidenceAlready: z.boolean(),
  reasoning: z.string(),
});
export type LinkTriageOutput = z.infer<typeof linkTriageOutput>;

// ---------------------------------------------------------------------------
// Agent C — Company Researcher
// ---------------------------------------------------------------------------

export const companyResearchOutput = z.object({
  summary: z.string(),
  product: z.string(),
  industriesServed: z.array(z.string()),
  useCases: z.array(z.string()),
  positioning: z.string(),
  businessModel: z.string(),
  majorOffers: z.array(z.string()),
  customerLanguage: z.array(z.string()),
  competitorsMentioned: z.array(z.string()),
  findings: z.array(sourcedFinding),
});
export type CompanyResearchOutput = z.infer<typeof companyResearchOutput>;

// ---------------------------------------------------------------------------
// Agent D — Competitor Researcher
// ---------------------------------------------------------------------------

export const competitorProfile = z.object({
  name: z.string(),
  url: z.string(),
  valueProposition: z.string(),
  positioning: z.string(),
  audienceSpecificity: z.string(),
  ctas: z.array(z.string()),
  proof: z.array(z.string()),
  industrySegmentation: z.string(),
  offers: z.array(z.string()),
  personalization: z.string(),
  websiteExperienceNotes: z.string(),
});

export const competitorResearchOutput = z.object({
  competitors: z.array(competitorProfile).min(1).max(5),
  gapsRelevantToDynamify: z.array(z.string()),
});
export type CompetitorResearchOutput = z.infer<typeof competitorResearchOutput>;

// ---------------------------------------------------------------------------
// Agent E — Conversion Analyst (Dynamify scoring framework)
// ---------------------------------------------------------------------------

export const conversionScoreOutput = z.object({
  targetUrl: z.string(),
  valuePropositionScore: z.number().int().min(0).max(20),
  audienceClarityScore: z.number().int().min(0).max(15),
  proofScore: z.number().int().min(0).max(15),
  ctaScore: z.number().int().min(0).max(10),
  frictionScore: z.number().int().min(0).max(15),
  offerScore: z.number().int().min(0).max(10),
  messageMatchScore: z.number().int().min(0).max(15),
  explanations: z.object({
    valueProposition: z.string(),
    audienceClarity: z.string(),
    proof: z.string(),
    cta: z.string(),
    friction: z.string(),
    offer: z.string(),
    messageMatch: z.string(),
  }),
});
export type ConversionScoreOutput = z.infer<typeof conversionScoreOutput>;

// ---------------------------------------------------------------------------
// Agent F — Personalization Analyst
// ---------------------------------------------------------------------------

export const diversityAssessment = z.object({
  present: z.boolean(),
  evidence: z.array(z.string()),
  confidence: evidenceConfidence,
});

export const personalizationOpportunityCandidate = z.object({
  name: z.string(),
  type: opportunityType,
  evidence: z.array(z.string()).min(1),
  detectability,
});

export const recommendedSegment = z.object({
  segment: z.string(),
  confidence: evidenceConfidence,
  why: z.array(z.string()).min(1),
  dynamifyMechanism: z.array(z.string()).min(1),
  detectability,
});

export const personalizationAnalysisOutput = z.object({
  audienceDiversity: diversityAssessment,
  industryDiversity: diversityAssessment,
  useCaseDiversity: diversityAssessment,
  roleDiversity: diversityAssessment,
  intentDiversity: diversityAssessment,
  geographicDiversity: diversityAssessment,
  productDiversity: diversityAssessment,
  acquisitionSourceDiversity: diversityAssessment,
  personalizationPotentialScore: z.number().int().min(0).max(100),
  topOpportunities: z.array(personalizationOpportunityCandidate).min(1).max(3),
  recommendedSegments: z.array(recommendedSegment).min(1),
});
export type PersonalizationAnalysisOutput = z.infer<typeof personalizationAnalysisOutput>;

// ---------------------------------------------------------------------------
// Opportunity selection
// ---------------------------------------------------------------------------

export const opportunityCandidate = z.object({
  type: opportunityType,
  title: z.string(),
  whatIsWrong: z.string(),
  whyItMatters: z.string(),
  whoIsAffected: z.string(),
  evidence: z.array(sourcedFinding).min(1),
  whatShouldChange: z.string(),
  whyPersonalizationIsTheRightMechanism: z.string(),
  whatDynamifyWouldDoDynamically: z.string(),
  // Selection criteria from spec 1.3, each 0-100.
  evidenceStrength: z.number().int().min(0).max(100),
  commercialMeaningfulness: z.number().int().min(0).max(100),
  demonstrability: z.number().int().min(0).max(100),
  dynamifyAlignment: z.number().int().min(0).max(100),
  plausibility: z.number().int().min(0).max(100),
});

export const opportunitySelectionOutput = z.object({
  candidates: z.array(opportunityCandidate).min(1).max(6),
  primaryIndex: z.number().int().min(0),
  selectionRationale: z.string(),
});
export type OpportunitySelectionOutput = z.infer<typeof opportunitySelectionOutput>;

// ---------------------------------------------------------------------------
// Internal report
// ---------------------------------------------------------------------------

export const reportOutput = z.object({
  headline: z.string(),
  executiveSummary: z.string(),
  sections: z.object({
    companyOverview: z.string(),
    conversionAnalysis: z.string(),
    personalizationAnalysis: z.string(),
    primaryOpportunity: z.string(),
    competitorContext: z.string(),
    recommendedNextSteps: z.string(),
    evidenceAppendix: z.array(sourcedFinding),
  }),
});
export type ReportOutput = z.infer<typeof reportOutput>;

// ---------------------------------------------------------------------------
// Outreach draft — short, plain text, no image/attachment/link.
// ---------------------------------------------------------------------------

export const recipientGuess = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string().nullable(),
  confidence: evidenceConfidence,
});

export const outreachDraftOutput = z.object({
  subject: z.string().min(1).max(120),
  bodyText: z.string().min(1),
  recipientGuess,
});
export type OutreachDraftOutput = z.infer<typeof outreachDraftOutput>;

// ---------------------------------------------------------------------------
// Reply classification (used when a human logs an inbound reply)
// ---------------------------------------------------------------------------

export const replyClassificationOutput = z.object({
  sentiment: replySentiment,
  wantsDemo: z.boolean(),
  nextAction: z.string(),
});
export type ReplyClassificationOutput = z.infer<typeof replyClassificationOutput>;
