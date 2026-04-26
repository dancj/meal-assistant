import {
  AnthropicNetworkError,
  AnthropicUpstreamError,
  InvalidRequestError,
  MalformedPlanError,
  MissingEnvVarError,
} from "@/lib/plan/errors";
import { generatePlan, validateInput } from "@/lib/plan/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  let input;
  try {
    input = validateInput(body);
  } catch (err) {
    if (err instanceof InvalidRequestError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("Unexpected /api/generate-plan validation error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }

  try {
    const mealPlan = await generatePlan(input);
    return Response.json(mealPlan);
  } catch (err) {
    if (err instanceof MissingEnvVarError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof AnthropicUpstreamError) {
      return Response.json(
        err.status === undefined
          ? { error: "Anthropic upstream error" }
          : { error: "Anthropic upstream error", upstreamStatus: err.status },
        { status: 502 },
      );
    }
    if (err instanceof AnthropicNetworkError) {
      console.error("Anthropic network error", err);
      return Response.json(
        { error: "Anthropic network error" },
        { status: 502 },
      );
    }
    if (err instanceof MalformedPlanError) {
      console.error(
        "Anthropic returned malformed plan",
        { path: err.path, detail: err.message },
      );
      return Response.json(
        { error: "Model returned malformed plan", path: err.path },
        { status: 502 },
      );
    }
    console.error("Unexpected /api/generate-plan error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
