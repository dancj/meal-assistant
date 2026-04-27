import { isDemoMode } from "@/lib/demo/fixtures";
import {
  MissingEnvVarError,
  ResendUpstreamError,
} from "@/lib/email/errors";
import { sendMealPlanEmail } from "@/lib/email/send";
import { MalformedPlanError } from "@/lib/plan/errors";
import { assertMealPlan } from "@/lib/plan/validate";
import { currentWeekStart } from "@/lib/plan-ui/week";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  let plan;
  try {
    plan = assertMealPlan(body);
  } catch (err) {
    if (err instanceof MalformedPlanError) {
      return Response.json(
        { error: err.message, path: err.path },
        { status: 400 },
      );
    }
    console.error("Unexpected /api/email validation error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }

  if (isDemoMode()) {
    return Response.json(
      { ok: true, id: "demo-email-id" },
      { headers: { "X-Demo-Mode": "1" } },
    );
  }

  try {
    const { id } = await sendMealPlanEmail(plan, currentWeekStart());
    return Response.json({ ok: true, id });
  } catch (err) {
    if (err instanceof MissingEnvVarError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof ResendUpstreamError) {
      return Response.json(
        { error: "Resend upstream error", detail: err.message },
        { status: 502 },
      );
    }
    console.error("Unexpected /api/email error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
