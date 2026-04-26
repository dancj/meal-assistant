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

  // Recipes/deals/logs are array-shape only; element shape is trusted from
  // /api/recipes and /api/deals. Cast through unknown to match our contract.
  return {
    recipes: body.recipes as GeneratePlanInput["recipes"],
    deals: body.deals as GeneratePlanInput["deals"],
    logs: body.logs as MealLog[],
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
