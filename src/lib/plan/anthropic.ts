import Anthropic from "@anthropic-ai/sdk";
import { MissingEnvVarError } from "./errors";

export const MODEL = "claude-sonnet-4-6";
export const MAX_TOKENS = 4096;
export const TEMPERATURE = 0.7;
export const TIMEOUT_MS = 60_000;

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client !== null) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new MissingEnvVarError("ANTHROPIC_API_KEY");
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

// Test-only: reset the memoized client so per-test env stubs take effect.
export function _resetAnthropicClientForTests(): void {
  _client = null;
}
