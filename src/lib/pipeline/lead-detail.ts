/**
 * Assembles everything the dashboard needs to review one lead in a single
 * query pass — used by both the lead detail API route and the server
 * component page, so the two never drift.
 */
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  leads,
  icpQualifications,
  websiteMaps,
  capturedPages,
  companyResearch,
  competitorResearch,
  conversionScores,
  personalizationAnalyses,
  opportunities,
  reports,
  outreachDrafts,
  replies,
  crmOutcomes,
  pipelineRuns,
  pipelineStageEvents,
} from "@/lib/db/schema";

export async function getLeadDetail(leadId: string) {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) return null;

  const [
    icp,
    websiteMap,
    pages,
    company,
    competitors,
    conversion,
    personalization,
    opps,
    reportRows,
    outreach,
    replyRows,
    outcomes,
    runs,
  ] = await Promise.all([
    db.query.icpQualifications.findFirst({ where: eq(icpQualifications.leadId, leadId) }),
    db.query.websiteMaps.findFirst({ where: eq(websiteMaps.leadId, leadId) }),
    db.query.capturedPages.findMany({ where: eq(capturedPages.leadId, leadId) }),
    db.query.companyResearch.findFirst({ where: eq(companyResearch.leadId, leadId) }),
    db.query.competitorResearch.findFirst({ where: eq(competitorResearch.leadId, leadId) }),
    db.query.conversionScores.findFirst({ where: eq(conversionScores.leadId, leadId) }),
    db.query.personalizationAnalyses.findFirst({
      where: eq(personalizationAnalyses.leadId, leadId),
    }),
    db.query.opportunities.findMany({
      where: eq(opportunities.leadId, leadId),
      orderBy: [desc(opportunities.compositeScore)],
    }),
    db.query.reports.findMany({
      where: eq(reports.leadId, leadId),
      orderBy: [desc(reports.createdAt)],
    }),
    db.query.outreachDrafts.findMany({
      where: eq(outreachDrafts.leadId, leadId),
      orderBy: [desc(outreachDrafts.createdAt)],
    }),
    db.query.replies.findMany({
      where: eq(replies.leadId, leadId),
      orderBy: [asc(replies.occurredAt)],
    }),
    db.query.crmOutcomes.findMany({
      where: eq(crmOutcomes.leadId, leadId),
      orderBy: [asc(crmOutcomes.occurredAt)],
    }),
    db.query.pipelineRuns.findMany({
      where: eq(pipelineRuns.leadId, leadId),
      orderBy: [desc(pipelineRuns.startedAt)],
      limit: 5,
    }),
  ]);

  const latestRun = runs[0];
  const stageEvents = latestRun
    ? await db.query.pipelineStageEvents.findMany({
        where: eq(pipelineStageEvents.pipelineRunId, latestRun.id),
        orderBy: [asc(pipelineStageEvents.startedAt)],
      })
    : [];

  return {
    lead,
    icp: icp ?? null,
    websiteMap: websiteMap ?? null,
    pages,
    company: company ?? null,
    competitors: competitors ?? null,
    conversion: conversion ?? null,
    personalization: personalization ?? null,
    opportunities: opps,
    reports: reportRows,
    outreach,
    replies: replyRows,
    outcomes,
    runs,
    stageEvents,
  };
}

export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>;
