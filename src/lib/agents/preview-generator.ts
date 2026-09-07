/**
 * Preview Generation — turns a demo strategy into DOM patches against the
 * real, captured page. See src/lib/preview/html.ts for why patches (not a
 * full HTML rewrite) are how this preserves the prospect's design.
 */
import { runStructured } from "./openai-client";
import { previewGenerationOutput, type PreviewGenerationOutput } from "./schemas";
import type { DemoStrategyOutput } from "./schemas";
import type { OutlineEntry } from "@/lib/preview/html";

export interface PreviewGeneratorInput {
  companyName: string;
  demoStrategy: DemoStrategyOutput;
  pageOutline: OutlineEntry[];
}

const INSTRUCTIONS = `You are the Preview Generator for Dynamify Scout.

You're given a demo strategy and an outline of the target page's text/interactive
elements, each with a stable "scoutId". Produce a bounded set of DOM patches
(3-30) that implement the planned changes — each patch's "selector" MUST be exactly
\`[data-scout-id="<id>"]\` for one of the ids in the outline. Do not invent selectors
outside the outline.

Use:
- "set_text" to replace an element's visible text (headlines, body copy, button
  labels, list items) — this is what you'll use for almost every copy change.
- "set_attribute" only to change an <img> "alt" or an <a>/button "href" when the
  strategy calls for pointing a CTA somewhere more relevant (e.g. a different anchor
  on the same page) — never invent a URL to a page that wasn't in the site's known
  structure.
- "remove" sparingly, only to remove an element that actively contradicts the target
  segment (e.g. a proof point for a completely different, irrelevant industry).
- "set_html" only when a change genuinely requires markup (e.g. wrapping part of a
  sentence in emphasis) — prefer set_text otherwise.

Every patch must map to one of the strategy's plannedChanges (put that change's
"section" value in the patch's "section" field). Keep new text in the voice/length
implied by the original element's text — a headline should read like a headline, a
button label should stay short. Never invent customer names, statistics, or claims not
already supported by the opportunity you were given.

preservedElementsConfirmed should list, from the strategy's preserveElements, which
ones you did NOT touch (should be all of them).`;

export async function generatePreview(
  input: PreviewGeneratorInput,
): Promise<PreviewGenerationOutput> {
  const { data } = await runStructured({
    tier: "writing",
    name: "preview_generation",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      demoStrategy: input.demoStrategy,
      pageOutline: input.pageOutline,
    }),
    schema: previewGenerationOutput,
    temperature: 0.5,
  });
  return data;
}
