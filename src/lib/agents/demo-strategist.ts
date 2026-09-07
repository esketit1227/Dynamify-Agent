/**
 * Demo Strategy — turns the selected primary opportunity into a concrete
 * plan for a single page's before/after preview: which page, which visitor
 * segment the "after" version targets, what stays untouched (design
 * language), and what changes section by section.
 */
import { runStructured } from "./openai-client";
import { demoStrategyOutput, type DemoStrategyOutput } from "./schemas";
import type { OpportunitySelectionOutput } from "./schemas";
import type { OutlineEntry } from "@/lib/preview/html";

export interface DemoStrategistInput {
  companyName: string;
  primaryOpportunity: OpportunitySelectionOutput["candidates"][number];
  targetPageUrl: string;
  targetPageOutline: OutlineEntry[];
}

const INSTRUCTIONS = `You are the Demo Strategist for Dynamify Scout.

You're given the single primary personalization opportunity already selected for this
prospect, and an outline of the text/interactive elements on the page we'll turn into a
before/after demo. Produce a concrete plan:

- targetSegment: the specific visitor segment the "after" version is written for (e.g.
  "a construction-company visitor arriving from an organic search for commercial
  construction software").
- narrativeSummary: 2-4 sentences a salesperson could say out loud to explain the demo.
- preserveElements: things that must NOT change — logo, primary nav labels, footer,
  overall layout, brand voice/tone, color and typography (call these out explicitly so
  the preview stays recognizably "their site, but smarter" rather than an unrelated
  redesign).
- plannedChanges: 3-8 concrete section-level changes (hero headline, a proof section, a
  CTA, an example/use-case block, etc.), each with the section, the change, and the
  rationale tying back to the opportunity.

Ground every planned change in something actually present in the page outline you were
given — reference real element text where relevant. Do not plan changes to elements
that aren't in the outline.`;

export async function planDemoStrategy(
  input: DemoStrategistInput,
): Promise<DemoStrategyOutput> {
  const { data } = await runStructured({
    tier: "writing",
    name: "demo_strategy",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      primaryOpportunity: input.primaryOpportunity,
      targetPageUrl: input.targetPageUrl,
      pageOutline: input.targetPageOutline,
    }),
    schema: demoStrategyOutput,
    temperature: 0.5,
  });
  return data;
}
