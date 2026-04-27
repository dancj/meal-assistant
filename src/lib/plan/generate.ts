import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import {
  getAnthropicClient,
  MAX_TOKENS,
  MODEL,
  TEMPERATURE,
  TIMEOUT_MS,
} from "./anthropic";
import {
  AnthropicNetworkError,
  AnthropicUpstreamError,
  InvalidRequestError,
  MalformedPlanError,
} from "./errors";
import { buildPrompt } from "./prompt";
import type { GeneratePlanInput, MealLog } from "./types";
import { isPlainObject, validateMealPlan } from "./validate";

const WEEK_RX = /^\d{4}-\d{2}-\d{2}$/;

function validateMealLog(value: unknown, path: string): MealLog {
  if (!isPlainObject(value)) {
    throw new InvalidRequestError(path, "expected object");
  }
  if (typeof value.week !== "string" || !WEEK_RX.test(value.week)) {
    throw new InvalidRequestError(`${path}.week`, "expected YYYY-MM-DD string");
  }
  if (
    !Array.isArray(value.cooked) ||
    !value.cooked.every((c): c is string => typeof c === "string")
  ) {
    throw new InvalidRequestError(
      `${path}.cooked`,
      "expected array of strings",
    );
  }
  if (
    !Array.isArray(value.skipped) ||
    !value.skipped.every((s): s is string => typeof s === "string")
  ) {
    throw new InvalidRequestError(
      `${path}.skipped`,
      "expected array of strings",
    );
  }
  let skipReason: string | undefined;
  if (value.skipReason !== undefined) {
    if (typeof value.skipReason !== "string") {
      throw new InvalidRequestError(
        `${path}.skipReason`,
        "expected string when present",
      );
    }
    if (value.skipReason !== "") skipReason = value.skipReason;
  }
  const log: MealLog = {
    week: value.week,
    cooked: value.cooked,
    skipped: value.skipped,
  };
  if (skipReason !== undefined) log.skipReason = skipReason;
  return log;
}

export function validateInput(body: unknown): GeneratePlanInput {
  if (!isPlainObject(body)) {
    throw new InvalidRequestError("<root>", "expected JSON object");
  }

  if (!Array.isArray(body.recipes)) {
    throw new InvalidRequestError("recipes", "expected array");
  }
  if (!Array.isArray(body.deals)) {
    throw new InvalidRequestError("deals", "expected array");
  }
  if (!Array.isArray(body.logs)) {
    throw new InvalidRequestError("logs", "expected array");
  }
  const logs = body.logs.map((log, i) =>
    validateMealLog(log, `logs[${i}]`),
  );
  if (!Array.isArray(body.pantry)) {
    throw new InvalidRequestError("pantry", "expected array");
  }
  if (!body.pantry.every((p): p is string => typeof p === "string")) {
    throw new InvalidRequestError("pantry", "expected array of strings");
  }
  if (
    body.preferences !== undefined &&
    typeof body.preferences !== "string"
  ) {
    throw new InvalidRequestError(
      "preferences",
      "expected string or omitted",
    );
  }

  // Recipes/deals are array-shape only; element shape is trusted from upstream
  // /api/recipes and /api/deals routes. logs are validated above.
  return {
    recipes: body.recipes as GeneratePlanInput["recipes"],
    deals: body.deals as GeneratePlanInput["deals"],
    logs,
    pantry: body.pantry,
    ...(body.preferences !== undefined ? { preferences: body.preferences } : {}),
  };
}

export async function generatePlan(input: GeneratePlanInput) {
  const client = getAnthropicClient();
  const { system, messages } = buildPrompt(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Message;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages,
      },
      { signal: controller.signal, timeout: TIMEOUT_MS },
    );
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new AnthropicUpstreamError(err.status, err.message);
    }
    throw new AnthropicNetworkError(err);
  } finally {
    clearTimeout(timer);
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (textBlock === undefined) {
    throw new MalformedPlanError("<root>", "no text block in response");
  }

  return validateMealPlan(textBlock.text);
}
