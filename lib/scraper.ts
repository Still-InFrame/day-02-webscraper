import type { Page } from "playwright";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import type { ScrapedPage } from "./types";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

export async function scrapePage(page: Page, url: string): Promise<ScrapedPage> {
  // DOMContentLoaded gets us a parsed DOM fast; networkidle then gives SPA JS
  // a chance to hydrate. Best-effort — if networkidle never settles (chat
  // widgets, analytics keepalive), we proceed with whatever rendered.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => {});

  const { html, title, metaDescription, h1 } = await page.evaluate(() => {
    const desc = document.querySelector('meta[name="description"]');
    return {
      html: document.documentElement.outerHTML,
      title: document.title || "",
      metaDescription: desc?.getAttribute("content") ?? "",
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
    };
  });

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const cleanedHtml = article?.content ?? html;

  const markdown = turndown.turndown(cleanedHtml).trim();
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  const u = new URL(url);
  return {
    url,
    pathname: (u.pathname + u.search) || "/",
    title,
    metaDescription,
    h1,
    wordCount,
    markdown,
  };
}

export async function discoverLinks(
  page: Page,
  origin: string,
): Promise<string[]> {
  return page.evaluate((origin) => {
    const anchors = Array.from(
      document.querySelectorAll("a[href]"),
    ) as HTMLAnchorElement[];
    const out = new Set<string>();
    for (const a of anchors) {
      try {
        const u = new URL(a.href, document.baseURI);
        if (u.origin !== origin) continue;
        u.hash = "";
        out.add(u.toString());
      } catch {
        // ignore malformed hrefs
      }
    }
    return Array.from(out);
  }, origin);
}
