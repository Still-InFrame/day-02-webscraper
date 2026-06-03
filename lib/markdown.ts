import type { ScrapeResult } from "./types";

export function assembleMarkdown(result: ScrapeResult): string {
  const lines: string[] = [];
  lines.push(`# ${result.hostname} — scraped ${result.startedAt.slice(0, 10)}`);
  lines.push("");
  lines.push(`- Origin: ${result.origin}`);
  lines.push(`- Pages: ${result.pages.length}`);
  lines.push(`- Started: ${result.startedAt}`);
  lines.push(`- Finished: ${result.finishedAt}`);
  lines.push("");

  for (const page of result.pages) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${page.pathname}`);
    lines.push("");
    lines.push(`- URL: ${page.url}`);
    lines.push(`- Title: ${page.title || "_(none)_"}`);
    lines.push(`- Meta description: ${page.metaDescription || "_(none)_"}`);
    lines.push(`- H1: ${page.h1 || "_(none)_"}`);
    lines.push(`- Word count: ${page.wordCount}`);
    lines.push("");
    lines.push(page.markdown || "_(no body content extracted)_");
    lines.push("");
  }

  return lines.join("\n");
}
