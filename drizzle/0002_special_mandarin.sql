DROP TABLE "demo_strategies" CASCADE;--> statement-breakpoint
DROP TABLE "preview_qa_checks" CASCADE;--> statement-breakpoint
DROP TABLE "previews" CASCADE;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::text;--> statement-breakpoint
DROP TYPE "public"."lead_status";--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualifying', 'disqualified', 'researching', 'analyzing', 'opportunity_selected', 'report_ready', 'outreach_drafted', 'pending_approval', 'approved', 'sent', 'replied', 'demo_scheduled', 'won', 'lost', 'archived');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "pipeline_runs" ALTER COLUMN "current_stage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pipeline_stage_events" ALTER COLUMN "stage" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."pipeline_stage";--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('icp_qualification', 'website_acquisition', 'website_exploration', 'company_research', 'competitor_research', 'conversion_analysis', 'personalization_analysis', 'opportunity_scoring', 'opportunity_selection', 'internal_report', 'outreach_draft', 'human_approval', 'outreach_send', 'reply_tracking', 'crm_outcome', 'learning_eval');--> statement-breakpoint
ALTER TABLE "pipeline_runs" ALTER COLUMN "current_stage" SET DATA TYPE "public"."pipeline_stage" USING "current_stage"::"public"."pipeline_stage";--> statement-breakpoint
ALTER TABLE "pipeline_stage_events" ALTER COLUMN "stage" SET DATA TYPE "public"."pipeline_stage" USING "stage"::"public"."pipeline_stage";--> statement-breakpoint
DROP TYPE "public"."preview_status";--> statement-breakpoint
DROP TYPE "public"."qa_check_type";