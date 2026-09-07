/**
 * A single denormalized read for the lead throughput table — one row per
 * lead with just enough signal (ICP fit, conversion score, personalization
 * score, primary opportunity) to triage without opening each lead.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  leads,
  icpQualifications,
  conversionScores,
  personalizationAnalyses,
  opportunities,
} from "@/lib/db/schema";

export interface LeadListRow {
  id: string;
  companyName: string;
  domain: string;
  status: string;
  ownerEmail: string | null;
  createdAt: Date;
  fitScore: number | null;
  conversionTotalScore: number | null;
  personalizationPotentialScore: number | null;
  primaryOpportunityTitle: string | null;
}

export async function getLeadListView(): Promise<LeadListRow[]> {
  const rows = await db.query.leads.findMany({
    orderBy: [desc(leads.createdAt)],
    limit: 200,
  });

  return Promise.all(
    rows.map(async (lead): Promise<LeadListRow> => {
      const [icp, conversion, personalization, primaryOpportunity] = await Promise.all([
        db.query.icpQualifications.findFirst({ where: eq(icpQualifications.leadId, lead.id) }),
        db.query.conversionScores.findFirst({ where: eq(conversionScores.leadId, lead.id) }),
        db.query.personalizationAnalyses.findFirst({
          where: eq(personalizationAnalyses.leadId, lead.id),
        }),
        db.query.opportunities.findFirst({
          where: and(eq(opportunities.leadId, lead.id), eq(opportunities.isPrimary, true)),
        }),
      ]);

      return {
        id: lead.id,
        companyName: lead.companyName,
        domain: lead.domain,
        status: lead.status,
        ownerEmail: lead.ownerEmail,
        createdAt: lead.createdAt,
        fitScore: icp?.fitScore ?? null,
        conversionTotalScore: conversion?.totalScore ?? null,
        personalizationPotentialScore: personalization?.personalizationPotentialScore ?? null,
        primaryOpportunityTitle: primaryOpportunity?.title ?? null,
      };
    }),
  );
}
