import type { Browser } from "playwright";
import type { ScrapedPage } from "./types";
import { scrapePage, discoverLinks } from "./scraper";

export const MAX_PAGES = 15;
export const MAX_DEPTH = 2;

type QueueItem = { url: string; depth: number };

export async function crawl(
  browser: Browser,
  startUrl: string,
): Promise<ScrapedPage[]> {
  const origin = new URL(startUrl).origin;
  const visited = new Set<string>();
  const pages: ScrapedPage[] = [];
  const queue: QueueItem[] = [{ url: normalizeUrl(startUrl), depth: 0 }];

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let homepageLinksFound = 0;

  try {
    while (queue.length > 0 && pages.length < MAX_PAGES) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);

      try {
        const scraped = await scrapePage(page, item.url);
        pages.push(scraped);

        if (item.depth < MAX_DEPTH) {
          const links = await discoverLinks(page, origin);
          if (pages.length === 1) homepageLinksFound = links.length;
          for (const link of links) {
            const normalized = normalizeUrl(link);
            if (!visited.has(normalized)) {
              queue.push({ url: normalized, depth: item.depth + 1 });
            }
          }
        }
      } catch (err) {
        console.error(`[crawler] failed: ${item.url}`, err);
      }
    }

    // Sitemap fallback: only when the homepage exposed no internal links.
    // For most marketing sites the BFS path covers everything; this catches
    // SPAs with broken/missing nav links or sites that hide their structure.
    if (pages.length === 1 && homepageLinksFound === 0) {
      const sitemapUrls = await fetchSitemap(origin);
      for (const url of sitemapUrls) {
        if (pages.length >= MAX_PAGES) break;
        const normalized = normalizeUrl(url);
        if (visited.has(normalized)) continue;
        visited.add(normalized);
        try {
          const scraped = await scrapePage(page, normalized);
          pages.push(scraped);
        } catch (err) {
          console.error(`[crawler/sitemap] failed: ${normalized}`, err);
        }
      }
    }
  } finally {
    await context.close();
  }

  return pages;
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.toString();
}

async function fetchSitemap(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": "webscraper-md/0.1" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g));
    return matches.map((m) => m[1]).filter((u) => u.startsWith(origin));
  } catch {
    return [];
  }
}
