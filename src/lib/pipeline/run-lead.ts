/**
 * The Scout pipeline orchestrator.
 *
 * Runs a lead through every automatic stage — ICP qualification, website
 * exploration, company/competitor research, conversion + personalization
 * analysis, opportunity selection, demo strategy, preview generation + QA,
 * the internal report, and the outreach draft — then stops. Sending
 * outreach always requires a separate, explicit human approval action (see
 * src/lib/pipeline/send-outreach.ts); this orchestrator never sends email.
 *
 * Each stage is wrapped by `runStage`, which persists a
 * `pipeline_stage_events` row with the stage's input/output, so the whole
 * run is auditable from the dashboard even when nothing goes wrong.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  leads,
  pipelineRuns,
  icpQualifications,
  websiteMaps,
  capturedPages,
  companyResearch,
  competitorResearch,
  conversionScores,
  personalizationAnalyses,
  opportunities,
  demoStrategies,
  previews,
  previewQaChecks,
  reports,
  outreachDrafts,
  type WebsiteMapPage,
} from "@/lib/db/schema";
import { runStage } from "./stage-runner";
import { qualifyIcp } from "@/lib/agents/icp-qualifier";
import { exploreWebsite } from "@/lib/agents/website-explorer";
import { researchCompany } from "@/lib/agents/company-researcher";
import { researchCompetitors } from "@/lib/agents/competitor-researcher";
import { analyzeConversion } from "@/lib/agents/conversion-analyst";
import { analyzePersonalization } from "@/lib/agents/personalization-analyst";
import { selectOpportunity } from "@/lib/agents/opportunity-selector";
import { planDemoStrategy } from "@/lib/agents/demo-strategist";
import { generatePreview } from "@/lib/agents/preview-generator";
import { runPreviewQa } from "@/lib/agents/preview-qa";
import { generateReport } from "@/lib/agents/report-generator";
import { draftOutreach } from "@/lib/agents/outreach-drafter";
import { preparePage, applyPatches } from "@/lib/preview/html";
import { renderHtmlToScreenshot } from "@/lib/capture/browser";
import { getStorage } from "@/lib/capture/storage";

async function setLeadStatus(leadId: string, status: (typeof leads.$inferInsert)["status"]) {
  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, leadId));
}

export async function runLeadPipeline(leadId: string): Promise<{ pipelineRunId: string }> {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const [run] = await db
    .insert(pipelineRuns)
    .values({ leadId, status: "running" })
    .returning();
  const pipelineRunId = run!.id;

  try {
    // -------------------------------------------------------------------
    // Agent A — ICP Qualifier
    // -------------------------------------------------------------------
    await setLeadStatus(leadId, "qualifying");
    const icp = await runStage({
      pipelineRunId,
      leadId,
      stage: "icp_qualification",
      input: { companyName: lead.companyName, domain: lead.domain },
      fn: () =>
        qualifyIcp({
          companyName: lead.companyName,
          domain: lead.domain,
          enrichment: lead.notes ?? undefined,
        }),
    });

    await db.insert(icpQualifications).values({
      leadId,
      fitScore: icp.fitScore,
      fitReasons: icp.fitReasons,
      disqualifiers: icp.disqualifiers,
      businessModel: icp.businessModel,
      likelyConversionObjective: icp.likelyWebsiteConversionObjective,
      likelyDecisionMaker: icp.likelyDecisionMaker,
      shouldAnalyze: icp.shouldAnalyze,
      rawOutput: icp as never,
    });

    if (!icp.shouldAnalyze) {
      await setLeadStatus(leadId, "disqualified");
      await db
        .update(pipelineRuns)
        .set({ status: "succeeded", finishedAt: new Date() })
        .where(eq(pipelineRuns.id, pipelineRunId));
      return { pipelineRunId };
    }

    // -------------------------------------------------------------------
    // Agent B — Website Explorer (acquisition + exploration)
    // -------------------------------------------------------------------
    await setLeadStatus(leadId, "researching");
    const exploration = await runStage({
      pipelineRunId,
      leadId,
      stage: "website_exploration",
      input: { homepageUrl: lead.homepageUrl },
      fn: () => exploreWebsite({ leadId, homepageUrl: lead.homepageUrl }),
    });

    const websiteMapPages: WebsiteMapPage[] = exploration.pages.map((p) => ({
      url: p.url,
      pageType: p.pageType,
      title: p.title,
      whyVisited: p.whyRelevant,
    }));

    const [websiteMap] = await db
      .insert(websiteMaps)
      .values({
        leadId,
        homepageUrl: exploration.homepageUrl,
        pageBudget: exploration.pageBudget,
        pagesVisitedCount: exploration.pagesVisitedCount,
        stoppedEarly: exploration.stoppedEarly,
        stopReason: exploration.stopReason,
        pages: websiteMapPages,
        navStructure: exploration.navStructure,
      })
      .returning();

    const storage = getStorage();
    await db.insert(capturedPages).values(
      exploration.pages.map((p) => ({
        websiteMapId: websiteMap!.id,
        leadId,
        url: p.url,
        pageType: p.pageType,
        title: p.title,
        textContent: p.textContent,
        htmlSnapshotPath: storage.locate(p.htmlStorageKey),
        screenshotPath: storage.locate(p.screenshotStorageKey),
        mobileScreenshotPath: storage.locate(p.mobileScreenshotStorageKey),
      })),
    );

    const homepagePage = exploration.pages[0]!;

    // -------------------------------------------------------------------
    // Agent C — Company Researcher
    // -------------------------------------------------------------------
    const companyResearchResult = await runStage({
      pipelineRunId,
      leadId,
      stage: "company_research",
      fn: () =>
        researchCompany({
          companyName: lead.companyName,
          domain: lead.domain,
          pages: exploration.pages,
        }),
    });

    await db.insert(companyResearch).values({
      leadId,
      ...companyResearchResult,
    });

    // -------------------------------------------------------------------
    // Agent D — Competitor Researcher
    // -------------------------------------------------------------------
    const competitorResearchResult = await runStage({
      pipelineRunId,
      leadId,
      stage: "competitor_research",
      fn: () =>
        researchCompetitors({
          companyName: lead.companyName,
          domain: lead.domain,
          companyResearch: companyResearchResult,
        }),
    });

    await db.insert(competitorResearch).values({
      leadId,
      competitors: competitorResearchResult.competitors,
      gapsRelevantToDynamify: competitorResearchResult.gapsRelevantToDynamify,
    });

    // -------------------------------------------------------------------
    // Agent E — Conversion Analyst
    // -------------------------------------------------------------------
    await setLeadStatus(leadId, "analyzing");
    const conversionResult = await runStage({
      pipelineRunId,
      leadId,
      stage: "conversion_analysis",
      fn: () =>
        analyzeConversion({
          companyName: lead.companyName,
          targetPage: homepagePage,
          supportingPages: exploration.pages.slice(1),
        }),
    });

    const totalScore =
      conversionResult.valuePropositionScore +
      conversionResult.audienceClarityScore +
      conversionResult.proofScore +
      conversionResult.ctaScore +
      conversionResult.frictionScore +
      conversionResult.offerScore +
      conversionResult.messageMatchScore;

    await db.insert(conversionScores).values({
      leadId,
      ...conversionResult,
      totalScore,
    });

    // -------------------------------------------------------------------
    // Agent F — Personalization Analyst
    // -------------------------------------------------------------------
    const personalizationResult = await runStage({
      pipelineRunId,
      leadId,
      stage: "personalization_analysis",
      fn: () =>
        analyzePersonalization({
          companyName: lead.companyName,
          companyResearch: companyResearchResult,
          competitorResearch: competitorResearchResult,
          pages: exploration.pages,
        }),
    });

    await db.insert(personalizationAnalyses).values({
      leadId,
      ...personalizationResult,
    });

    // -------------------------------------------------------------------
    // Opportunity selection (spec 1.3 — exactly one primary opportunity)
    // -------------------------------------------------------------------
    const selection = await runStage({
      pipelineRunId,
      leadId,
      stage: "opportunity_selection",
      fn: () =>
        selectOpportunity({
          companyName: lead.companyName,
          companyResearch: companyResearchResult,
          competitorResearch: competitorResearchResult,
          conversionScore: conversionResult,
          personalizationAnalysis: personalizationResult,
        }),
    });

    const insertedOpportunities = await db
      .insert(opportunities)
      .values(
        selection.candidates.map((c, idx) => ({
          leadId,
          type: c.type,
          title: c.title,
          whatIsWrong: c.whatIsWrong,
          whyItMatters: c.whyItMatters,
          whoIsAffected: c.whoIsAffected,
          evidence: c.evidence,
          whatShouldChange: c.whatShouldChange,
          whyPersonalizationIsTheRightMechanism: c.whyPersonalizationIsTheRightMechanism,
          whatDynamifyWouldDoDynamically: c.whatDynamifyWouldDoDynamically,
          evidenceStrength: c.evidenceStrength,
          commercialMeaningfulness: c.commercialMeaningfulness,
          demonstrability: c.demonstrability,
          dynamifyAlignment: c.dynamifyAlignment,
          plausibility: c.plausibility,
          compositeScore: c.compositeScore,
          isPrimary: idx === selection.primaryIndex,
          selectionRationale: idx === selection.primaryIndex ? selection.selectionRationale : null,
        })),
      )
      .returning();

    const primaryOpportunityRow = insertedOpportunities[selection.primaryIndex]!;
    const primaryOpportunityCandidate = selection.candidates[selection.primaryIndex]!;

    await setLeadStatus(leadId, "opportunity_selected");

    // -------------------------------------------------------------------
    // Demo strategy
    // -------------------------------------------------------------------
    const targetPageUrl = homepagePage.url;
    const homepageHtmlBuffer = await storage.read(homepagePage.htmlStorageKey);
    const prepared = preparePage(homepageHtmlBuffer.toString("utf-8"), targetPageUrl);

    const strategy = await runStage({
      pipelineRunId,
      leadId,
      stage: "demo_strategy",
      fn: () =>
        planDemoStrategy({
          companyName: lead.companyName,
          primaryOpportunity: primaryOpportunityCandidate,
          targetPageUrl,
          targetPageOutline: prepared.outline,
        }),
    });

    const [demoStrategyRow] = await db
      .insert(demoStrategies)
      .values({
        leadId,
        opportunityId: primaryOpportunityRow.id,
        targetPageUrl: strategy.targetPageUrl,
        targetSegment: strategy.targetSegment,
        narrativeSummary: strategy.narrativeSummary,
        preserveElements: strategy.preserveElements,
        plannedChanges: strategy.plannedChanges,
      })
      .returning();

    // -------------------------------------------------------------------
    // Preview generation (design-preserving DOM patches)
    // -------------------------------------------------------------------
    const previewGen = await runStage({
      pipelineRunId,
      leadId,
      stage: "preview_generation",
      fn: () =>
        generatePreview({
          companyName: lead.companyName,
          demoStrategy: strategy,
          pageOutline: prepared.outline,
        }),
    });

    const patchResult = applyPatches(prepared.annotatedHtml, previewGen.patches);

    const [beforeScreenshot, afterScreenshot] = await Promise.all([
      renderHtmlToScreenshot(prepared.annotatedHtml),
      renderHtmlToScreenshot(patchResult.html),
    ]);

    const previewBase = `leads/${leadId}/previews/${demoStrategyRow!.id}`;
    const [beforeHtmlKey, afterHtmlKey, beforeShotKey, afterShotKey] = await Promise.all([
      storage.put(`${previewBase}/before.html`, prepared.annotatedHtml, "text/html"),
      storage.put(`${previewBase}/after.html`, patchResult.html, "text/html"),
      storage.put(`${previewBase}/before.png`, beforeScreenshot, "image/png"),
      storage.put(`${previewBase}/after.png`, afterScreenshot, "image/png"),
    ]);

    const [previewRow] = await db
      .insert(previews)
      .values({
        leadId,
        opportunityId: primaryOpportunityRow.id,
        demoStrategyId: demoStrategyRow!.id,
        targetPageUrl,
        beforeHtmlPath: storage.locate(beforeHtmlKey),
        beforeScreenshotPath: storage.locate(beforeShotKey),
        afterHtmlPath: storage.locate(afterHtmlKey),
        afterScreenshotPath: storage.locate(afterShotKey),
        changesSummary: previewGen.changesSummary,
        status: "draft",
      })
      .returning();

    // -------------------------------------------------------------------
    // Preview QA
    // -------------------------------------------------------------------
    const qa = await runStage({
      pipelineRunId,
      leadId,
      stage: "preview_qa",
      fn: () =>
        runPreviewQa({
          companyName: lead.companyName,
          afterHtml: patchResult.html,
          changesSummary: previewGen.changesSummary,
          supportingEvidence: primaryOpportunityCandidate.evidence,
          skippedPatchCount: patchResult.skipped.length,
        }),
    });

    await db.insert(previewQaChecks).values(
      qa.checks.map((c) => ({
        previewId: previewRow!.id,
        checkType: c.checkType,
        passed: c.passed,
        notes: c.notes,
      })),
    );

    await db
      .update(previews)
      .set({ status: qa.overallPassed ? "qa_passed" : "qa_failed" })
      .where(eq(previews.id, previewRow!.id));

    await setLeadStatus(leadId, "preview_ready");

    // -------------------------------------------------------------------
    // Internal report
    // -------------------------------------------------------------------
    const report = await runStage({
      pipelineRunId,
      leadId,
      stage: "internal_report",
      fn: () =>
        generateReport({
          companyName: lead.companyName,
          domain: lead.domain,
          companyResearch: companyResearchResult,
          competitorResearch: competitorResearchResult,
          conversionScore: conversionResult,
          personalizationAnalysis: personalizationResult,
          primaryOpportunity: primaryOpportunityCandidate,
        }),
    });

    const [reportRow] = await db
      .insert(reports)
      .values({
        leadId,
        opportunityId: primaryOpportunityRow.id,
        headline: report.headline,
        executiveSummary: report.executiveSummary,
        sections: report.sections,
      })
      .returning();

    await setLeadStatus(leadId, "report_ready");

    // -------------------------------------------------------------------
    // Outreach draft (short, plain text, no link/image/attachment) — then
    // stop and wait for a human. This orchestrator never sends email.
    // -------------------------------------------------------------------
    const outreach = await runStage({
      pipelineRunId,
      leadId,
      stage: "outreach_draft",
      fn: () =>
        draftOutreach({
          companyName: lead.companyName,
          domain: lead.domain,
          primaryOpportunity: primaryOpportunityCandidate,
        }),
    });

    await db.insert(outreachDrafts).values({
      leadId,
      opportunityId: primaryOpportunityRow.id,
      reportId: reportRow!.id,
      subject: outreach.subject,
      bodyText: outreach.bodyText,
      recipientGuess: outreach.recipientGuess,
      status: "pending_approval",
    });

    await setLeadStatus(leadId, "pending_approval");

    await db
      .update(pipelineRuns)
      .set({ status: "succeeded", finishedAt: new Date() })
      .where(eq(pipelineRuns.id, pipelineRunId));

    return { pipelineRunId };
  } catch (err) {
    await db
      .update(pipelineRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, pipelineRunId));
    throw err;
  }
}
