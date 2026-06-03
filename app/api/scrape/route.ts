import { NextResponse } from "next/server";
import { z } from "zod";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crawl } from "@/lib/crawler";
import { assembleMarkdown } from "@/lib/markdown";
import type { ScrapeResult } from "@/lib/types";

export const runtime = "nodejs";
// Crawling 15 pages can take a minute; keep Next from killing the request.
export const maxDuration = 300;

const Body = z.object({
  url: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const normalized = normalizeInputUrl(parsed.data.url);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const pages = await crawl(browser, normalized.toString());
    if (pages.length === 0) {
      return NextResponse.json(
        { error: "No pages could be scraped from that site." },
        { status: 422 },
      );
    }

    const finishedAt = new Date().toISOString();
    const result: ScrapeResult = {
      hostname: normalized.hostname,
      origin: normalized.origin,
      startedAt,
      finishedAt,
      pages,
    };

    const markdown = assembleMarkdown(result);
    const outDir = path.join(process.cwd(), "scrapes");
    await mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${normalized.hostname}.md`);
    await writeFile(outPath, markdown, "utf8");

    return NextResponse.json({
      path: outPath,
      hostname: normalized.hostname,
      pageCount: pages.length,
    });
  } catch (err) {
    console.error("[api/scrape] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 },
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

function normalizeInputUrl(raw: string): URL | null {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProtocol);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u;
  } catch {
    return null;
  }
}
