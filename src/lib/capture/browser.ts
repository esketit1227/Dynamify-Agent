/**
 * Deterministic browser capture used by the Website Explorer (Agent B) and
 * by Preview QA. Chromium is expected to already be installed in this
 * environment (see PLAYWRIGHT_BROWSERS_PATH) — we never call
 * `playwright install` at runtime.
 */
import { chromium, type Browser, type Page } from "playwright";

export interface CapturedLink {
  href: string;
  text: string;
}

export interface PageCapture {
  url: string;
  title: string;
  textContent: string;
  links: CapturedLink[];
  navStructure: string[];
  screenshotPng: Buffer;
  mobileScreenshotPng: Buffer;
  html: string;
}

let sharedBrowser: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = undefined;
  }
}

const NAV_SELECTOR = "nav a, header a, [role='navigation'] a";
const MAX_TEXT_CONTENT_CHARS = 20_000;

async function extractFromPage(page: Page, url: string): Promise<Omit<PageCapture, "screenshotPng" | "mobileScreenshotPng">> {
  const title = await page.title();

  const textContent = await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
    return (clone.innerText || "").replace(/\s+\n/g, "\n").trim();
  });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a.textContent || "").trim().slice(0, 120),
      }))
      .filter((l) => l.href && !l.href.startsWith("javascript:"));
  });

  const navStructure = await page.evaluate((selector) => {
    return Array.from(document.querySelectorAll(selector))
      .map((a) => (a.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 40);
  }, NAV_SELECTOR);

  const html = await page.content();

  return {
    url,
    title,
    textContent: textContent.slice(0, MAX_TEXT_CONTENT_CHARS),
    links,
    navStructure,
    html,
  };
}

export async function capturePage(url: string): Promise<PageCapture> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) DynamifyScout/1.0",
  });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 }).catch(() =>
      page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }),
    );
    const extracted = await extractFromPage(page, page.url());
    const screenshotPng = await page.screenshot({ fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileScreenshotPng = await page.screenshot({ fullPage: true });

    return { ...extracted, screenshotPng, mobileScreenshotPng };
  } finally {
    await context.close();
  }
}

/** Render arbitrary HTML (e.g. a generated preview variant) and screenshot it. */
export async function renderHtmlToScreenshot(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    return await page.screenshot({ fullPage: true });
  } finally {
    await context.close();
  }
}
