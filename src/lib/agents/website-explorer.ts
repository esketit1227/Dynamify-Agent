/**
 * Agent B — Website Explorer.
 *
 * Opens the homepage, inspects navigation, and follows a budgeted set of
 * high-value internal pages (product/service, pricing, industry/solution,
 * case studies, contact/demo/checkout, FAQ/resources). Stops early once the
 * model judges there's already enough evidence to support downstream
 * research and analysis — we don't crawl for the sake of crawling.
 */
import { capturePage } from "@/lib/capture/browser";
import { getStorage } from "@/lib/capture/storage";
import { runStructured } from "./openai-client";
import { linkTriageOutput, websitePageType, type LinkTriageOutput } from "./schemas";
import { z } from "zod";

export type WebsitePageType = z.infer<typeof websitePageType>;

export interface ExploredPage {
  url: string;
  pageType: WebsitePageType;
  title: string;
  whyRelevant: string;
  textContent: string;
  navStructure: string[];
  htmlStorageKey: string;
  screenshotStorageKey: string;
  mobileScreenshotStorageKey: string;
}

export interface WebsiteExplorationResult {
  homepageUrl: string;
  pageBudget: number;
  pagesVisitedCount: number;
  stoppedEarly: boolean;
  stopReason: string | null;
  pages: ExploredPage[];
  navStructure: string[];
}

export interface ExploreWebsiteOptions {
  leadId: string;
  homepageUrl: string;
  /** Total pages including the homepage. Spec default: homepage + up to 8. */
  pageBudget?: number;
}

function sameRegistrableDomain(a: string, b: string): boolean {
  try {
    const hostA = new URL(a).hostname.replace(/^www\./, "");
    const hostB = new URL(b).hostname.replace(/^www\./, "");
    return hostA === hostB;
  } catch {
    return false;
  }
}

function normalizeForDedupe(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function storeCapture(
  leadId: string,
  pageIndex: number,
  capture: Awaited<ReturnType<typeof capturePage>>,
): Promise<{ htmlKey: string; screenshotKey: string; mobileKey: string }> {
  const storage = getStorage();
  const base = `leads/${leadId}/pages/${pageIndex}`;
  const [htmlKey, screenshotKey, mobileKey] = await Promise.all([
    storage.put(`${base}/page.html`, capture.html, "text/html"),
    storage.put(`${base}/screenshot.png`, capture.screenshotPng, "image/png"),
    storage.put(`${base}/mobile.png`, capture.mobileScreenshotPng, "image/png"),
  ]);
  return { htmlKey, screenshotKey, mobileKey };
}

export async function exploreWebsite(
  opts: ExploreWebsiteOptions,
): Promise<WebsiteExplorationResult> {
  const pageBudget = opts.pageBudget ?? 9;
  const homepage = await capturePage(opts.homepageUrl);
  const stored = await storeCapture(opts.leadId, 0, homepage);

  const visitedNormalized = new Set<string>([normalizeForDedupe(homepage.url)]);

  const pages: ExploredPage[] = [
    {
      url: homepage.url,
      pageType: "homepage",
      title: homepage.title,
      whyRelevant: "Entry point for every visitor; establishes baseline messaging.",
      textContent: homepage.textContent,
      navStructure: homepage.navStructure,
      htmlStorageKey: stored.htmlKey,
      screenshotStorageKey: stored.screenshotKey,
      mobileScreenshotStorageKey: stored.mobileKey,
    },
  ];

  const candidateLinks = homepage.links
    .filter((l) => sameRegistrableDomain(l.href, homepage.url))
    .filter((l) => !visitedNormalized.has(normalizeForDedupe(l.href)))
    .reduce<typeof homepage.links>((acc, link) => {
      const norm = normalizeForDedupe(link.href);
      if (!acc.some((existing) => normalizeForDedupe(existing.href) === norm)) {
        acc.push(link);
      }
      return acc;
    }, [])
    .slice(0, 60);

  let triage: LinkTriageOutput | null = null;
  if (candidateLinks.length > 0 && pageBudget > 1) {
    const { data } = await runStructured({
      tier: "research",
      name: "website_link_triage",
      instructions:
        "You are the Website Explorer agent for Dynamify Scout, an internal tool that researches " +
        "prospective customers of Dynamify (an autonomous website personalization product). " +
        "Given the homepage content and its internal links, rank the links most likely to reveal: " +
        "distinct audiences/industries/use-cases served, pricing/offer structure, proof (case studies, " +
        "logos, testimonials), and the primary conversion path (contact/demo/checkout). " +
        "Classify each into a pageType. Only include links worth visiting — skip legal/privacy/careers/blog-index " +
        "unless nothing else is available. Set enoughEvidenceAlready=true only if the homepage text alone " +
        "already makes the company's audience segmentation and conversion objective clear.",
      input: JSON.stringify({
        homepageUrl: homepage.url,
        homepageTitle: homepage.title,
        homepageText: homepage.textContent.slice(0, 6000),
        navStructure: homepage.navStructure,
        candidateLinks: candidateLinks.map((l) => ({ href: l.href, text: l.text })),
        remainingBudget: pageBudget - 1,
      }),
      schema: linkTriageOutput,
      temperature: 0.2,
    });
    triage = data;
  }

  let stoppedEarly = false;
  let stopReason: string | null = null;

  if (!triage || triage.rankedLinks.length === 0) {
    stoppedEarly = pages.length < pageBudget;
    stopReason = "No relevant internal links found beyond the homepage.";
  } else {
    const targetAdditional = triage.enoughEvidenceAlready
      ? Math.min(3, triage.rankedLinks.length, pageBudget - 1)
      : Math.min(pageBudget - 1, triage.rankedLinks.length);

    const ranked = [...triage.rankedLinks].sort((a, b) => b.priority - a.priority);

    for (const link of ranked) {
      if (pages.length - 1 >= targetAdditional) break;
      const norm = normalizeForDedupe(link.url);
      if (visitedNormalized.has(norm)) continue;
      visitedNormalized.add(norm);

      try {
        const capture = await capturePage(link.url);
        const storedPage = await storeCapture(opts.leadId, pages.length, capture);
        pages.push({
          url: capture.url,
          pageType: link.pageType,
          title: capture.title,
          whyRelevant: link.whyRelevant,
          textContent: capture.textContent,
          navStructure: capture.navStructure,
          htmlStorageKey: storedPage.htmlKey,
          screenshotStorageKey: storedPage.screenshotKey,
          mobileScreenshotStorageKey: storedPage.mobileKey,
        });
      } catch {
        // A single broken/slow internal page shouldn't abort exploration —
        // continue and let downstream stages work with what we have.
        continue;
      }
    }

    if (triage.enoughEvidenceAlready && pages.length < pageBudget) {
      stoppedEarly = true;
      stopReason = triage.reasoning;
    } else if (pages.length >= pageBudget) {
      stopReason = "Reached the page budget.";
    }
  }

  return {
    homepageUrl: homepage.url,
    pageBudget,
    pagesVisitedCount: pages.length,
    stoppedEarly,
    stopReason,
    pages,
    navStructure: homepage.navStructure,
  };
}
