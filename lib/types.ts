export type ScrapedPage = {
  url: string;
  pathname: string;
  title: string;
  metaDescription: string;
  h1: string;
  wordCount: number;
  markdown: string;
};

export type ScrapeResult = {
  hostname: string;
  origin: string;
  startedAt: string;
  finishedAt: string;
  pages: ScrapedPage[];
};
