import { parseRecipients } from "@/lib/email";
import { getResend } from "@/lib/resend";
import type { MealPlan } from "@/lib/plan/types";
import { MissingEnvVarError, ResendUpstreamError } from "./errors";
import { formatMealPlanEmail } from "./format";

function readNonEmpty(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new MissingEnvVarError(name);
  }
  return value;
}

export async function sendMealPlanEmail(
  plan: MealPlan,
  weekStart: string,
): Promise<{ id: string }> {
  // Read env up front; reject before constructing the Resend client.
  readNonEmpty("RESEND_API_KEY");
  const from = readNonEmpty("EMAIL_FROM");
  let to: string[];
  try {
    to = parseRecipients(process.env.EMAIL_RECIPIENTS);
  } catch {
    throw new MissingEnvVarError("EMAIL_RECIPIENTS");
  }

  const client = getResend();
  const { subject, html, text } = formatMealPlanEmail(plan, weekStart);

  let result: { data: { id: string } | null; error: unknown } | undefined;
  try {
    result = (await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
    })) as typeof result;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ResendUpstreamError(detail);
  }

  if (!result || result.error) {
    const errObj = result?.error as
      | { message?: unknown; name?: unknown }
      | null
      | undefined;
    const message =
      typeof errObj?.message === "string" ? errObj.message : "unknown error";
    const name = typeof errObj?.name === "string" ? errObj.name : undefined;
    throw new ResendUpstreamError(message, name);
  }

  if (!result.data?.id) {
    throw new ResendUpstreamError("missing message id in response");
  }

  console.log("Meal plan email sent", { id: result.data.id });
  return { id: result.data.id };
}
