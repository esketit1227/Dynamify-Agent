CREATE TYPE "public"."crm_stage" AS ENUM('no_response', 'demo_booked', 'demo_completed', 'opportunity_created', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."detectability" AS ENUM('directly_detectable', 'inferable', 'requires_enrichment', 'requires_declared_information');--> statement-breakpoint
CREATE TYPE "public"."evidence_confidence" AS ENUM('observed', 'strong_inference', 'hypothesis');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualifying', 'disqualified', 'researching', 'analyzing', 'opportunity_selected', 'preview_ready', 'report_ready', 'outreach_drafted', 'pending_approval', 'approved', 'sent', 'replied', 'demo_scheduled', 'won', 'lost', 'archived');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('industry_personalization', 'use_case_personalization', 'role_persona_personalization', 'intent_personalization', 'campaign_message_match_personalization', 'returning_vs_new_visitor_personalization', 'geography_localization', 'product_category_personalization', 'social_proof_personalization', 'cta_personalization', 'offer_personalization', 'conversion_message_optimization');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('icp_qualification', 'website_acquisition', 'website_exploration', 'company_research', 'competitor_research', 'conversion_analysis', 'personalization_analysis', 'opportunity_scoring', 'opportunity_selection', 'demo_strategy', 'preview_generation', 'preview_qa', 'internal_report', 'outreach_draft', 'human_approval', 'outreach_send', 'reply_tracking', 'crm_outcome', 'learning_eval');--> statement-breakpoint
CREATE TYPE "public"."preview_status" AS ENUM('draft', 'qa_failed', 'qa_passed', 'approved');--> statement-breakpoint
CREATE TYPE "public"."qa_check_type" AS ENUM('brand_consistency', 'factual_accuracy', 'broken_link', 'responsive_rendering', 'no_unsupported_claims');--> statement-breakpoint
CREATE TYPE "public"."reply_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."reply_sentiment" AS ENUM('interested', 'wants_more_info', 'not_interested', 'out_of_office', 'unsubscribe', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "captured_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_map_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"url" text NOT NULL,
	"page_type" text NOT NULL,
	"title" text,
	"text_content" text,
	"html_snapshot_path" text,
	"screenshot_path" text,
	"mobile_screenshot_path" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"product" text NOT NULL,
	"industries_served" jsonb NOT NULL,
	"use_cases" jsonb NOT NULL,
	"positioning" text NOT NULL,
	"business_model" text NOT NULL,
	"major_offers" jsonb NOT NULL,
	"customer_language" jsonb NOT NULL,
	"competitors_mentioned" jsonb NOT NULL,
	"findings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_research_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "competitor_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"competitors" jsonb NOT NULL,
	"gaps_relevant_to_dynamify" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitor_research_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "conversion_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"value_proposition_score" integer NOT NULL,
	"audience_clarity_score" integer NOT NULL,
	"proof_score" integer NOT NULL,
	"cta_score" integer NOT NULL,
	"friction_score" integer NOT NULL,
	"offer_score" integer NOT NULL,
	"message_match_score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"explanations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversion_scores_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "crm_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"stage" "crm_stage" NOT NULL,
	"notes" text,
	"deal_value_usd" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"target_page_url" text NOT NULL,
	"target_segment" text NOT NULL,
	"narrative_summary" text NOT NULL,
	"preserve_elements" jsonb NOT NULL,
	"planned_changes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_strategies_opportunity_id_unique" UNIQUE("opportunity_id")
);
--> statement-breakpoint
CREATE TABLE "eval_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"crm_outcome_id" uuid,
	"icp_fit_score" integer,
	"conversion_total_score" integer,
	"personalization_potential_score" integer,
	"opportunity_type" "opportunity_type",
	"reply_sentiment" "reply_sentiment",
	"final_outcome" "crm_stage",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icp_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"fit_score" integer NOT NULL,
	"fit_reasons" jsonb NOT NULL,
	"disqualifiers" jsonb NOT NULL,
	"business_model" text NOT NULL,
	"likely_conversion_objective" text NOT NULL,
	"likely_decision_maker" text NOT NULL,
	"should_analyze" boolean NOT NULL,
	"raw_output" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"domain" text NOT NULL,
	"homepage_url" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"owner_email" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "opportunity_type" NOT NULL,
	"title" text NOT NULL,
	"what_is_wrong" text NOT NULL,
	"why_it_matters" text NOT NULL,
	"who_is_affected" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"what_should_change" text NOT NULL,
	"why_personalization_is_the_right_mechanism" text NOT NULL,
	"what_dynamify_would_do_dynamically" text NOT NULL,
	"evidence_strength" integer NOT NULL,
	"commercial_meaningfulness" integer NOT NULL,
	"demonstrability" integer NOT NULL,
	"dynamify_alignment" integer NOT NULL,
	"plausibility" integer NOT NULL,
	"composite_score" real NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"selection_rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"report_id" uuid,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"edited_body_text" text,
	"recipient_guess" jsonb NOT NULL,
	"status" "outreach_status" DEFAULT 'draft' NOT NULL,
	"approved_by_email" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personalization_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"audience_diversity" jsonb NOT NULL,
	"industry_diversity" jsonb NOT NULL,
	"use_case_diversity" jsonb NOT NULL,
	"role_diversity" jsonb NOT NULL,
	"intent_diversity" jsonb NOT NULL,
	"geographic_diversity" jsonb NOT NULL,
	"product_diversity" jsonb NOT NULL,
	"acquisition_source_diversity" jsonb NOT NULL,
	"personalization_potential_score" integer NOT NULL,
	"top_opportunities" jsonb NOT NULL,
	"recommended_segments" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personalization_analyses_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"current_stage" "pipeline_stage",
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_run_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"stage" "pipeline_stage" NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "preview_qa_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preview_id" uuid NOT NULL,
	"check_type" "qa_check_type" NOT NULL,
	"passed" boolean NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"demo_strategy_id" uuid NOT NULL,
	"target_page_url" text NOT NULL,
	"before_html_path" text NOT NULL,
	"before_screenshot_path" text,
	"after_html_path" text NOT NULL,
	"after_screenshot_path" text,
	"changes_summary" jsonb NOT NULL,
	"status" "preview_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"outreach_draft_id" uuid,
	"direction" "reply_direction" NOT NULL,
	"body_text" text NOT NULL,
	"sentiment" "reply_sentiment" DEFAULT 'unknown' NOT NULL,
	"wants_demo" boolean DEFAULT false NOT NULL,
	"next_action" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"headline" text NOT NULL,
	"executive_summary" text NOT NULL,
	"sections" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"homepage_url" text NOT NULL,
	"page_budget" integer DEFAULT 9 NOT NULL,
	"pages_visited_count" integer NOT NULL,
	"stopped_early" boolean DEFAULT false NOT NULL,
	"stop_reason" text,
	"pages" jsonb NOT NULL,
	"nav_structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_maps_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
ALTER TABLE "captured_pages" ADD CONSTRAINT "captured_pages_website_map_id_website_maps_id_fk" FOREIGN KEY ("website_map_id") REFERENCES "public"."website_maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captured_pages" ADD CONSTRAINT "captured_pages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_research" ADD CONSTRAINT "company_research_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_research" ADD CONSTRAINT "competitor_research_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_scores" ADD CONSTRAINT "conversion_scores_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_outcomes" ADD CONSTRAINT "crm_outcomes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_strategies" ADD CONSTRAINT "demo_strategies_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_strategies" ADD CONSTRAINT "demo_strategies_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_records" ADD CONSTRAINT "eval_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_records" ADD CONSTRAINT "eval_records_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_records" ADD CONSTRAINT "eval_records_crm_outcome_id_crm_outcomes_id_fk" FOREIGN KEY ("crm_outcome_id") REFERENCES "public"."crm_outcomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_qualifications" ADD CONSTRAINT "icp_qualifications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personalization_analyses" ADD CONSTRAINT "personalization_analyses_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_events" ADD CONSTRAINT "pipeline_stage_events_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_events" ADD CONSTRAINT "pipeline_stage_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_qa_checks" ADD CONSTRAINT "preview_qa_checks_preview_id_previews_id_fk" FOREIGN KEY ("preview_id") REFERENCES "public"."previews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previews" ADD CONSTRAINT "previews_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previews" ADD CONSTRAINT "previews_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previews" ADD CONSTRAINT "previews_demo_strategy_id_demo_strategies_id_fk" FOREIGN KEY ("demo_strategy_id") REFERENCES "public"."demo_strategies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_outreach_draft_id_outreach_drafts_id_fk" FOREIGN KEY ("outreach_draft_id") REFERENCES "public"."outreach_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_maps" ADD CONSTRAINT "website_maps_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "captured_pages_lead_idx" ON "captured_pages" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_domain_idx" ON "leads" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "opportunities_lead_idx" ON "opportunities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "pipeline_stage_events_lead_idx" ON "pipeline_stage_events" USING btree ("lead_id","stage");--> statement-breakpoint
CREATE INDEX "previews_lead_idx" ON "previews" USING btree ("lead_id");