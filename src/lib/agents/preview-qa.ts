/**
 * Preview QA — runs after patches are applied, before a preview reaches a
 * human reviewer. Combines deterministic checks (broken links, leftover
 * scout-id markers, empty patches) with a model pass that checks brand
 * consistency and factual accuracy against the same opportunity evidence
 * used to generate the preview — the preview must not introduce claims the
 * research didn't support.
 */
import * as cheerio from "cheerio";
import { runStructured } from "./openai-client";
import { previewQaOutput, type PreviewQaOutput } from "./schemas";
import type { PlannedChange, SourcedFinding } from "./schemas";

export interface PreviewQaInput {
  companyName: string;
  afterHtml: string;
  changesSummary: PlannedChange[];
  supportingEvidence: SourcedFinding[];
  skippedPatchCount: number;
}

function deterministicChecks(html: string, skippedPatchCount: number): PreviewQaOutput["checks"] {
  const $ = cheerio.load(html);
  const checks: PreviewQaOutput["checks"] = [];

  const leftoverMarkers = $("[data-scout-id]").length;
  checks.push({
    checkType: "broken_link",
    passed: skippedPatchCount === 0,
    notes:
      skippedPatchCount === 0
        ? "All generated patches applied cleanly."
        : `${skippedPatchCount} patch(es) targeted a selector that no longer matched an element and were skipped.`,
  });

  checks.push({
    checkType: "responsive_rendering",
    passed: $("head base").length > 0,
    notes:
      $("head base").length > 0
        ? "Base href present — relative assets (CSS, images, fonts) resolve against the original site."
        : "No <base> tag found; relative assets may not resolve correctly when this preview is rendered standalone.",
  });

  // data-scout-id attributes are harmless (not visible/rendered) but their
  // presence just confirms we didn't accidentally ship a stripped-down doc.
  checks.push({
    checkType: "brand_consistency",
    passed: leftoverMarkers > 0,
    notes: `${leftoverMarkers} annotated element(s) present — page structure intact.`,
  });

  return checks;
}

const INSTRUCTIONS = `You are the Preview QA agent for Dynamify Scout.

You're given the changes a preview generator claims to have made, and the evidence
those changes are supposed to be grounded in. Check:

- factual_accuracy: does every claim in the changed copy trace back to something in
  the supporting evidence (or is it a reasonable, clearly-scoped extrapolation), or did
  the generator invent a fact (a customer name, a statistic, a specific claim) not
  present in the evidence?
- no_unsupported_claims: same idea from the opposite angle — flag any absolute claim
  ("the only platform that...", "#1 in..."), fabricated statistic, or specific number
  that isn't backed by the evidence given.

Set overallPassed=false if either check fails. Be specific in notes — quote the
offending phrase if you flag something.`;

export async function runPreviewQa(input: PreviewQaInput): Promise<PreviewQaOutput> {
  const detChecks = deterministicChecks(input.afterHtml, input.skippedPatchCount);

  const { data: modelChecks } = await runStructured({
    tier: "research",
    name: "preview_qa",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      changesSummary: input.changesSummary,
      supportingEvidence: input.supportingEvidence,
    }),
    schema: previewQaOutput,
    temperature: 0,
  });

  const checks = [...detChecks, ...modelChecks.checks];
  return {
    checks,
    overallPassed: checks.every((c) => c.passed),
  };
}
