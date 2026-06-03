"use client";

import { useState, type FormEvent } from "react";

const URL_PATTERN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

type Result = {
  path: string;
  hostname: string;
  pageCount: number;
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: Result }
  | { kind: "error"; message: string };

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const isValid = URL_PATTERN.test(url.trim());
  const isLoading = status.kind === "loading";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid || isLoading) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Scrape failed" });
        return;
      }
      setStatus({ kind: "done", result: data });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  async function onOpen(path: string) {
    await fetch("/api/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  function reset() {
    setStatus({ kind: "idle" });
    setUrl("");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Site → Markdown
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Crawl a site like a real visitor would (up to 15 pages, 2 levels
            deep) and get one clean Markdown file ready to feed an LLM for an
            audit.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <label
            htmlFor="url"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Website URL
          </label>
          <input
            id="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
          />
          {url && !isValid ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              That doesn&apos;t look like a valid URL.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? (
              <>
                <Spinner /> Scraping…
              </>
            ) : (
              "Scrape site"
            )}
          </button>

          {isLoading ? (
            <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
              Launching Chromium and crawling. Usually 30–60 seconds.
            </p>
          ) : null}
        </form>

        {status.kind === "done" ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
              Done — scraped {status.result.pageCount} page
              {status.result.pageCount === 1 ? "" : "s"} from{" "}
              {status.result.hostname}
            </h2>
            <p className="mt-2 break-all font-mono text-xs text-emerald-800 dark:text-emerald-300">
              {status.result.path}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onOpen(status.result.path)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                Open in Finder
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-transparent dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                Scrape another
              </button>
            </div>
          </div>
        ) : null}

        {status.kind === "error" ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
            <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
              Scrape failed
            </h2>
            <p className="mt-2 text-sm text-red-800 dark:text-red-300">
              {status.message}
            </p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-900/40"
            >
              Try again
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
