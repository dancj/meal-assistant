import type { Deal } from "@/lib/deals/types";
import type { Recipe } from "@/lib/recipes/types";
import type { GeneratePlanInput, MealPlan } from "@/lib/plan/types";

export class ApiError extends Error {
  readonly endpoint: string;
  readonly status: number | undefined;

  constructor(endpoint: string, status: number | undefined, detail: string) {
    const statusPart = status === undefined ? "no status" : `status ${status}`;
    super(`${endpoint} failed (${statusPart}): ${detail}`);
    this.name = "ApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

async function readBodySnippet(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (text === "") return "<empty body>";
    try {
      const parsed: unknown = JSON.parse(text);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof (parsed as { error: unknown }).error === "string"
      ) {
        return (parsed as { error: string }).error;
      }
    } catch {
      // not JSON — fall through to raw snippet
    }
    return text.slice(0, 200);
  } catch {
    return "<unreadable body>";
  }
}

async function getJson<T>(endpoint: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(endpoint, undefined, `network error: ${detail}`);
  }
  if (!response.ok) {
    const detail = await readBodySnippet(response);
    throw new ApiError(endpoint, response.status, detail);
  }
  try {
    return (await response.json()) as T;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(endpoint, response.status, `invalid JSON: ${detail}`);
  }
}

async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(endpoint, undefined, `network error: ${detail}`);
  }
  if (!response.ok) {
    const detail = await readBodySnippet(response);
    throw new ApiError(endpoint, response.status, detail);
  }
  try {
    return (await response.json()) as T;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(endpoint, response.status, `invalid JSON: ${detail}`);
  }
}

export function fetchRecipes(): Promise<Recipe[]> {
  return getJson<Recipe[]>("/api/recipes");
}

export function fetchDeals(): Promise<Deal[]> {
  return getJson<Deal[]>("/api/deals");
}

export function generatePlan(input: GeneratePlanInput): Promise<MealPlan> {
  return postJson<MealPlan>("/api/generate-plan", input);
}
