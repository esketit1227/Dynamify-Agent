/**
 * HTML utilities for design-preserving preview generation.
 *
 * We never ask the model to regenerate an entire page of HTML — that risks
 * mangling markup, losing styles, or subtly breaking the prospect's design
 * language. Instead we annotate the captured page with stable
 * `data-scout-id` markers on text-bearing/interactive elements, hand the
 * model a compact outline of just those elements, and apply the model's
 * response back as a small set of targeted DOM patches (set text, set
 * inner HTML, set an attribute, or remove). Everything else in the page —
 * logo, layout, CSS, imagery — is untouched byte-for-byte.
 */
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { DomPatchOperation } from "@/lib/agents/schemas";

export interface OutlineEntry {
  scoutId: string;
  tag: string;
  text: string;
  href: string | null;
  src: string | null;
  alt: string | null;
}

export interface PreparedPage {
  /** Script-stripped, base-href-injected, data-scout-id-annotated HTML. Safe to render/screenshot as-is (the "before"). */
  annotatedHtml: string;
  outline: OutlineEntry[];
}

const OUTLINE_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "a",
  "button",
  "figcaption",
  "blockquote",
  "img",
];

const MAX_OUTLINE_ENTRIES = 220;
const MAX_TEXT_LEN = 220;

/** Remove all script tags — we only need a static, safe-to-render document. */
function stripScripts($: cheerio.CheerioAPI): void {
  $("script").remove();
  // Inline event handlers are dead weight once scripts are gone, and a
  // potential injection vector once we start writing model-provided HTML
  // back into this document via set_html patches.
  $("*").each((_, el) => {
    const attribs = (el as Element).attribs;
    if (!attribs) return;
    for (const name of Object.keys(attribs)) {
      if (name.toLowerCase().startsWith("on")) {
        $(el).removeAttr(name);
      }
    }
  });
}

function ensureBaseHref($: cheerio.CheerioAPI, pageUrl: string): void {
  const origin = new URL(pageUrl).origin;
  if ($("head base").length === 0) {
    if ($("head").length === 0) {
      $("html").prepend("<head></head>");
    }
    $("head").prepend(`<base href="${origin}/">`);
  }
}

function sanitizeHtmlFragment(html: string): string {
  const $ = cheerio.load(html, null, false);
  $("script").remove();
  return $.root().html() ?? "";
}

/** Strip scripts, inject a <base> tag for correct relative asset resolution, and annotate text/interactive elements with stable selectors. */
export function preparePage(html: string, pageUrl: string): PreparedPage {
  const $ = cheerio.load(html);
  stripScripts($);
  ensureBaseHref($, pageUrl);

  const outline: OutlineEntry[] = [];
  let counter = 0;

  $(OUTLINE_TAGS.join(",")).each((_, el) => {
    if (outline.length >= MAX_OUTLINE_ENTRIES) return;
    const node = $(el);
    const tag = (el as Element).tagName?.toLowerCase() ?? "";
    const text = node.clone().children().remove().end().text().trim();
    const isImg = tag === "img";
    if (!isImg && text.length === 0) return;

    counter += 1;
    const scoutId = `s${counter}`;
    node.attr("data-scout-id", scoutId);

    outline.push({
      scoutId,
      tag,
      text: text.slice(0, MAX_TEXT_LEN),
      href: tag === "a" ? node.attr("href") ?? null : null,
      src: isImg ? node.attr("src") ?? null : null,
      alt: isImg ? node.attr("alt") ?? null : null,
    });
  });

  return { annotatedHtml: $.html(), outline };
}

export interface ApplyPatchesResult {
  html: string;
  appliedCount: number;
  skipped: { selector: string; reason: string }[];
}

/** Apply model-authored DOM patches to already-`preparePage`d HTML. */
export function applyPatches(annotatedHtml: string, patches: DomPatchOperation[]): ApplyPatchesResult {
  const $ = cheerio.load(annotatedHtml);
  let appliedCount = 0;
  const skipped: { selector: string; reason: string }[] = [];

  for (const patch of patches) {
    let target: ReturnType<typeof $>;
    try {
      target = $(patch.selector).first();
    } catch {
      skipped.push({ selector: patch.selector, reason: "Invalid CSS selector." });
      continue;
    }
    if (target.length === 0) {
      skipped.push({ selector: patch.selector, reason: "Selector matched no element." });
      continue;
    }

    switch (patch.action) {
      case "set_text":
        target.text(patch.value ?? "");
        appliedCount += 1;
        break;
      case "set_html":
        target.html(sanitizeHtmlFragment(patch.value ?? ""));
        appliedCount += 1;
        break;
      case "set_attribute":
        if (!patch.attribute) {
          skipped.push({ selector: patch.selector, reason: "Missing attribute name." });
          break;
        }
        target.attr(patch.attribute, patch.value ?? "");
        appliedCount += 1;
        break;
      case "remove":
        target.remove();
        appliedCount += 1;
        break;
    }
  }

  return { html: $.html(), appliedCount, skipped };
}
