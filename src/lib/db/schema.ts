/**
 * Dynamify Scout data model.
 *
 * Mirrors the pipeline in the product spec end to end:
 *   Lead -> ICP qualification -> website acquisition/exploration -> company
 *   research -> competitor research -> conversion analysis -> personalization
 *   analysis -> opportunity selection -> internal report -> outreach draft ->
 *   human approval -> outreach send -> reply tracking -> CRM outcome -> eval
 *   dataset.
 *
 * Scout researches and analyzes a prospect and drafts outreach whose goal is
 * to book a meeting — it does not generate an actual demo page. The demo
 * shown on that call is the real Dynamify product running on the prospect's
 * site, not an artifact Scout produces.
 *
 * Every agent-produced table keeps its raw structured output in a `raw`
 * jsonb column alongside normalized columns used by the UI, so nothing the
 * model returns is lost even as the UI evolves.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "qualifying",
  "disqualified",
  "researching",
  "analyzing",
  "opportunity_selected",
  "report_ready",
  "outreach_drafted",
  "pending_approval",
  "approved",
  "sent",
  "replied",
  "demo_scheduled",
  "won",
  "lost",
  "archived",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "icp_qualification",
  "website_acquisition",
  "website_exploration",
  "company_research",
  "competitor_research",
  "conversion_analysis",
  "personalization_analysis",
  "opportunity_scoring",
  "opportunity_selection",
  "internal_report",
  "outreach_draft",
  "human_approval",
  "outreach_send",
  "reply_tracking",
  "crm_outcome",
  "learning_eval",
]);

export const stageStatusEnum = pgEnum("stage_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

/** Every factual claim in the system must be labeled with one of these. */
export const evidenceConfidenceEnum = pgEnum("evidence_confidence", [
  "observed",
  "strong_inference",
  "hypothesis",
]);

/** How reliably Dynamify could detect a given visitor segment in production. */
export const detectabilityEnum = pgEnum("detectability", [
  "directly_detectable",
  "inferable",
  "requires_enrichment",
  "requires_declared_information",
]);

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "industry_personalization",
  "use_case_personalization",
  "role_persona_personalization",
  "intent_personalization",
  "campaign_message_match_personalization",
  "returning_vs_new_visitor_personalization",
  "geography_localization",
  "product_category_personalization",
  "social_proof_personalization",
  "cta_personalization",
  "offer_personalization",
  "conversion_message_optimization",
]);

export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "sent",
  "failed",
]);

export const replyDirectionEnum = pgEnum("reply_direction", [
  "inbound",
  "outbound",
]);

export const replySentimentEnum = pgEnum("reply_sentiment", [
  "interested",
  "wants_more_info",
  "not_interested",
  "out_of_office",
  "unsubscribe",
  "unknown",
]);

export const crmStageEnum = pgEnum("crm_stage", [
  "no_response",
  "demo_booked",
  "demo_completed",
  "opportunity_created",
  "closed_won",
  "closed_lost",
]);

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: text("company_name").notNull(),
    domain: text("domain").notNull(),
    homepageUrl: text("homepage_url").notNull(),
    source: text("source").notNull().default("manual"),
    status: leadStatusEnum("status").notNull().default("new"),
    ownerEmail: text("owner_email"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("leads_domain_idx").on(table.domain)],
);

export const leadsRelations = relations(leads, ({ many, one }) => ({
  pipelineRuns: many(pipelineRuns),
  icpQualification: one(icpQualifications, {
    fields: [leads.id],
    references: [icpQualifications.leadId],
  }),
  websiteMap: one(websiteMaps, {
    fields: [leads.id],
    references: [websiteMaps.leadId],
  }),
  companyResearch: one(companyResearch, {
    fields: [leads.id],
    references: [companyResearch.leadId],
  }),
  competitorResearch: one(competitorResearch, {
    fields: [leads.id],
    references: [competitorResearch.leadId],
  }),
  conversionScore: one(conversionScores, {
    fields: [leads.id],
    references: [conversionScores.leadId],
  }),
  personalizationAnalysis: one(personalizationAnalyses, {
    fields: [leads.id],
    references: [personalizationAnalyses.leadId],
  }),
  opportunities: many(opportunities),
  reports: many(reports),
  outreachDrafts: many(outreachDrafts),
  replies: many(replies),
  crmOutcomes: many(crmOutcomes),
}));

// ---------------------------------------------------------------------------
// Pipeline execution audit trail
// ---------------------------------------------------------------------------

export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  status: stageStatusEnum("status").notNull().default("pending"),
  currentStage: pipelineStageEnum("current_stage"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
});

export const pipelineRunsRelations = relations(pipelineRuns, ({ one, many }) => ({
  lead: one(leads, { fields: [pipelineRuns.leadId], references: [leads.id] }),
  events: many(pipelineStageEvents),
}));

export const pipelineStageEvents = pgTable(
  "pipeline_stage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineRunId: uuid("pipeline_run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    stage: pipelineStageEnum("stage").notNull(),
    status: stageStatusEnum("status").notNull().default("pending"),
    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("pipeline_stage_events_lead_idx").on(table.leadId, table.stage)],
);

// ---------------------------------------------------------------------------
// Agent A — ICP Qualifier
// ---------------------------------------------------------------------------

export const icpQualifications = pgTable("icp_qualifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  fitScore: integer("fit_score").notNull(),
  fitReasons: jsonb("fit_reasons").$type<string[]>().notNull(),
  disqualifiers: jsonb("disqualifiers").$type<string[]>().notNull(),
  businessModel: text("business_model").notNull(),
  likelyConversionObjective: text("likely_conversion_objective").notNull(),
  likelyDecisionMaker: text("likely_decision_maker").notNull(),
  shouldAnalyze: boolean("should_analyze").notNull(),
  rawOutput: jsonb("raw_output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Agent B — Website Explorer
// ---------------------------------------------------------------------------

export type WebsiteMapPage = {
  url: string;
  pageType:
    | "homepage"
    | "product"
    | "pricing"
    | "industry_solution"
    | "case_study"
    | "contact_demo_checkout"
    | "faq_resource"
    | "other";
  title: string;
  whyVisited: string;
};

export const websiteMaps = pgTable("website_maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" })
    .unique(),
  homepageUrl: text("homepage_url").notNull(),
  pageBudget: integer("page_budget").notNull().default(9),
  pagesVisitedCount: integer("pages_visited_count").notNull(),
  stoppedEarly: boolean("stopped_early").notNull().default(false),
  stopReason: text("stop_reason"),
  pages: jsonb("pages").$type<WebsiteMapPage[]>().notNull(),
  navStructure: jsonb("nav_structure"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const capturedPages = pgTable(
  "captured_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteMapId: uuid("website_map_id")
      .notNull()
      .references(() => websiteMaps.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pageType: text("page_type").notNull(),
    title: text("title"),
    textContent: text("text_content"),
    htmlSnapshotPath: text("html_snapshot_path"),
    screenshotPath: text("screenshot_path"),
    mobileScreenshotPath: text("mobile_screenshot_path"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("captured_pages_lead_idx").on(table.leadId)],
);

// ---------------------------------------------------------------------------
// Agent C — Company Researcher
// ---------------------------------------------------------------------------

export type SourcedFinding = {
  claim: string;
  sourceUrl: string | null;
  evidenceSnippet: string | null;
  confidence: "observed" | "strong_inference" | "hypothesis";
};

export const companyResearch = pgTable("company_research", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" })
    .unique(),
  summary: text("summary").notNull(),
  product: text("product").notNull(),
  industriesServed: jsonb("industries_served").$type<string[]>().notNull(),
  useCases: jsonb("use_cases").$type<string[]>().notNull(),
  positioning: text("positioning").notNull(),
  businessModel: text("business_model").notNull(),
  majorOffers: jsonb("major_offers").$type<string[]>().notNull(),
  customerLanguage: jsonb("customer_language").$type<string[]>().notNull(),
  competitorsMentioned: jsonb("competitors_mentioned").$type<string[]>().notNull(),
  findings: jsonb("findings").$type<SourcedFinding[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Agent D — Competitor Researcher
// ---------------------------------------------------------------------------

export type CompetitorProfile = {
  name: string;
  url: string;
  valueProposition: string;
  positioning: string;
  audienceSpecificity: string;
  ctas: string[];
  proof: string[];
  industrySegmentation: string;
  offers: string[];
  personalization: string;
  websiteExperienceNotes: string;
};

export const competitorResearch = pgTable("competitor_research", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" })
    .unique(),
  competitors: jsonb("competitors").$type<CompetitorProfile[]>().notNull(),
  gapsRelevantToDynamify: jsonb("gaps_relevant_to_dynamify").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Agent E — Conversion Analyst (Dynamify scoring framework, 100 pts)
// ---------------------------------------------------------------------------

export const conversionScores = pgTable("conversion_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" })
    .unique(),
  targetUrl: text("target_url").notNull(),
  valuePropositionScore: integer("value_proposition_score").notNull(), // /20
  audienceClarityScore: integer("audience_clarity_score").notNull(), // /15
  proofScore: integer("proof_score").notNull(), // /15
  ctaScore: integer("cta_score").notNull(), // /10
  frictionScore: integer("friction_score").notNull(), // /15
  offerScore: integer("offer_score").notNull(), // /10
  messageMatchScore: integer("message_match_score").notNull(), // /15
  totalScore: integer("total_score").notNull(), // /100
  explanations: jsonb("explanations")
    .$type<Record<
      | "valueProposition"
      | "audienceClarity"
      | "proof"
      | "cta"
      | "friction"
      | "offer"
      | "messageMatch",
      string
    >>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Agent F — Personalization Analyst
// ---------------------------------------------------------------------------

export type DiversityAssessment = {
  present: boolean;
  evidence: string[];
  confidence: "observed" | "strong_inference" | "hypothesis";
};

export type PersonalizationOpportunityCandidate = {
  name: string;
  type: (typeof opportunityTypeEnum.enumValues)[number];
  evidence: string[];
  detectability: (typeof detectabilityEnum.enumValues)[number];
};

export type RecommendedSegment = {
  segment: string;
  confidence: "observed" | "strong_inference" | "hypothesis";
  why: string[];
  dynamifyMechanism: string[];
  detectability: (typeof detectabilityEnum.enumValues)[number];
};

export const personalizationAnalyses = pgTable("personalization_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" })
    .unique(),
  audienceDiversity: jsonb("audience_diversity").$type<DiversityAssessment>().notNull(),
  industryDiversity: jsonb("industry_diversity").$type<DiversityAssessment>().notNull(),
  useCaseDiversity: jsonb("use_case_diversity").$type<DiversityAssessment>().notNull(),
  roleDiversity: jsonb("role_diversity").$type<DiversityAssessment>().notNull(),
  intentDiversity: jsonb("intent_diversity").$type<DiversityAssessment>().notNull(),
  geographicDiversity: jsonb("geographic_diversity").$type<DiversityAssessment>().notNull(),
  productDiversity: jsonb("product_diversity").$type<DiversityAssessment>().notNull(),
  acquisitionSourceDiversity: jsonb("acquisition_source_diversity")
    .$type<DiversityAssessment>()
    .notNull(),
  personalizationPotentialScore: integer("personalization_potential_score").notNull(), // 0-100
  topOpportunities: jsonb("top_opportunities")
    .$type<PersonalizationOpportunityCandidate[]>()
    .notNull(),
  recommendedSegments: jsonb("recommended_segments").$type<RecommendedSegment[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Opportunity selection (single primary opportunity per spec 1.3)
// ---------------------------------------------------------------------------

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: opportunityTypeEnum("type").notNull(),
    title: text("title").notNull(),
    whatIsWrong: text("what_is_wrong").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    whoIsAffected: text("who_is_affected").notNull(),
    evidence: jsonb("evidence").$type<SourcedFinding[]>().notNull(),
    whatShouldChange: text("what_should_change").notNull(),
    whyPersonalizationIsTheRightMechanism: text(
      "why_personalization_is_the_right_mechanism",
    ).notNull(),
    whatDynamifyWouldDoDynamically: text("what_dynamify_would_do_dynamically").notNull(),
    evidenceStrength: integer("evidence_strength").notNull(), // 0-100, criterion 1
    commercialMeaningfulness: integer("commercial_meaningfulness").notNull(), // 0-100, criterion 2
    demonstrability: integer("demonstrability").notNull(), // 0-100, criterion 3
    dynamifyAlignment: integer("dynamify_alignment").notNull(), // 0-100, criterion 4
    plausibility: integer("plausibility").notNull(), // 0-100, criterion 5
    compositeScore: real("composite_score").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    selectionRationale: text("selection_rationale"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("opportunities_lead_idx").on(table.leadId)],
);

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  lead: one(leads, { fields: [opportunities.leadId], references: [leads.id] }),
}));

// ---------------------------------------------------------------------------
// Internal report
// ---------------------------------------------------------------------------

export type ReportSections = {
  companyOverview: string;
  conversionAnalysis: string;
  personalizationAnalysis: string;
  primaryOpportunity: string;
  competitorContext: string;
  recommendedNextSteps: string;
  evidenceAppendix: SourcedFinding[];
};

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  sections: jsonb("sections").$type<ReportSections>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Outreach draft + human approval + send
// ---------------------------------------------------------------------------

export type RecipientGuess = {
  name: string | null;
  email: string | null;
  role: string | null;
  confidence: "observed" | "strong_inference" | "hypothesis";
};

export const outreachDrafts = pgTable("outreach_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  editedBodyText: text("edited_body_text"),
  recipientGuess: jsonb("recipient_guess").$type<RecipientGuess>().notNull(),
  status: outreachStatusEnum("status").notNull().default("draft"),
  approvedByEmail: text("approved_by_email"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  providerMessageId: text("provider_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Reply tracking
// ---------------------------------------------------------------------------

export const replies = pgTable("replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  outreachDraftId: uuid("outreach_draft_id").references(() => outreachDrafts.id, {
    onDelete: "set null",
  }),
  direction: replyDirectionEnum("direction").notNull(),
  bodyText: text("body_text").notNull(),
  sentiment: replySentimentEnum("sentiment").notNull().default("unknown"),
  wantsDemo: boolean("wants_demo").notNull().default(false),
  nextAction: text("next_action"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// CRM outcome + learning/eval dataset
// ---------------------------------------------------------------------------

export const crmOutcomes = pgTable("crm_outcomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  stage: crmStageEnum("stage").notNull(),
  notes: text("notes"),
  dealValueUsd: integer("deal_value_usd"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evalRecords = pgTable("eval_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  crmOutcomeId: uuid("crm_outcome_id").references(() => crmOutcomes.id, {
    onDelete: "set null",
  }),
  icpFitScore: integer("icp_fit_score"),
  conversionTotalScore: integer("conversion_total_score"),
  personalizationPotentialScore: integer("personalization_potential_score"),
  opportunityType: opportunityTypeEnum("opportunity_type"),
  replySentiment: replySentimentEnum("reply_sentiment"),
  finalOutcome: crmStageEnum("final_outcome"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
