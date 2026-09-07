import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  leads,
  crmOutcomes,
  evalRecords,
  icpQualifications,
  conversionScores,
  personalizationAnalyses,
  opportunities,
  replies,
  crmStageEnum,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const outcomeSchema = z.object({
  stage: z.enum(crmStageEnum.enumValues),
  notes: z.string().optional(),
  dealValueUsd: z.number().int().optional(),
  occurredAt: z.string().datetime().optional(),
});

const LEAD_STATUS_BY_CRM_STAGE: Partial<Record<(typeof crmStageEnum.enumValues)[number], (typeof leads.$inferInsert)["status"]>> = {
  demo_booked: "demo_scheduled",
  demo_completed: "demo_scheduled",
  closed_won: "won",
  closed_lost: "lost",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = outcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const [outcome] = await db
    .insert(crmOutcomes)
    .values({
      leadId: id,
      stage: parsed.data.stage,
      notes: parsed.data.notes,
      dealValueUsd: parsed.data.dealValueUsd,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    })
    .returning();

  const nextLeadStatus = LEAD_STATUS_BY_CRM_STAGE[parsed.data.stage];
  if (nextLeadStatus) {
    await db.update(leads).set({ status: nextLeadStatus, updatedAt: new Date() }).where(eq(leads.id, id));
  }

  // Build (or extend) this lead's learning/eval dataset entry — feeds the
  // "Learning/evaluation dataset" stage of the pipeline diagram.
  const [icp, conversion, personalization, primaryOpportunity, latestReply] = await Promise.all([
    db.query.icpQualifications.findFirst({ where: eq(icpQualifications.leadId, id) }),
    db.query.conversionScores.findFirst({ where: eq(conversionScores.leadId, id) }),
    db.query.personalizationAnalyses.findFirst({ where: eq(personalizationAnalyses.leadId, id) }),
    db.query.opportunities.findFirst({
      where: and(eq(opportunities.leadId, id), eq(opportunities.isPrimary, true)),
    }),
    db.query.replies.findFirst({ where: eq(replies.leadId, id), orderBy: [desc(replies.occurredAt)] }),
  ]);

  const [evalRecord] = await db
    .insert(evalRecords)
    .values({
      leadId: id,
      opportunityId: primaryOpportunity?.id,
      crmOutcomeId: outcome!.id,
      icpFitScore: icp?.fitScore,
      conversionTotalScore: conversion?.totalScore,
      personalizationPotentialScore: personalization?.personalizationPotentialScore,
      opportunityType: primaryOpportunity?.type,
      replySentiment: latestReply?.sentiment,
      finalOutcome: parsed.data.stage,
      notes: parsed.data.notes,
    })
    .returning();

  return NextResponse.json({ outcome, evalRecord });
}
