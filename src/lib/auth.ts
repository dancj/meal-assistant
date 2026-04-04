import { NextResponse } from "next/server";

/**
 * Check Bearer token auth against CRON_SECRET.
 * Returns null if auth passes, or a 401 NextResponse if it fails.
 * Auth is skipped entirely when CRON_SECRET is not configured.
 */
export function requireAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
