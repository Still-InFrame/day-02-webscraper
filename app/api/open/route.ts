import { NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";

const Body = z.object({
  path: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Path must resolve inside the project's scrapes/ dir — prevents an
  // arbitrary-path POST from popping Finder on /etc/passwd or anything else.
  const scrapesDir = path.join(process.cwd(), "scrapes");
  const target = path.resolve(parsed.data.path);
  if (!target.startsWith(scrapesDir + path.sep)) {
    return NextResponse.json({ error: "Path outside scrapes/" }, { status: 400 });
  }

  // `open -R` reveals the file in Finder (selected, parent folder shown).
  const proc = spawn("open", ["-R", target], { detached: true, stdio: "ignore" });
  proc.unref();

  return NextResponse.json({ ok: true });
}
