import { getResend } from "@/lib/resend";

// TODO #70: rebuild formatMealPlanEmail and sendMealPlanEmail against the new
// MealPlan shape (store-grouped grocery list with dealMatch, kidVersion per
// meal). The old HTML template and send logic were removed along with
// src/types/meal-plan.ts in the stack-strip refactor; parseRecipients stays
// because it has no MealPlan dependency.

export function parseRecipients(envVar: string | undefined): string[] {
  if (!envVar || !envVar.trim()) {
    throw new Error("EMAIL_RECIPIENTS environment variable is required");
  }
  const recipients = envVar
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (recipients.length === 0) {
    throw new Error("EMAIL_RECIPIENTS environment variable is required");
  }
  return recipients;
}

// Kept as a thin marker so #70 has an obvious re-entry point. Throws until
// that issue replaces it with a real implementation.
export async function sendMealPlanEmail(): Promise<never> {
  // Reference getResend so the import isn't flagged as unused until #70 wires
  // it back in.
  void getResend;
  throw new Error("sendMealPlanEmail not implemented — see #70");
}
