import type { GroceryItem, MealPlan, Store } from "@/lib/plan/types";
import { STORES } from "@/lib/plan/types";

const STORE_LABELS: Record<Store, string> = {
  aldi: "Aldi",
  safeway: "Safeway",
  costco: "Costco",
  wegmans: "Wegmans",
};

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ENTITY_MAP[c] ?? c);
}

function humanDate(weekStart: string): string {
  // weekStart is YYYY-MM-DD; build a UTC-noon Date so the formatted day
  // matches the calendar regardless of the runtime timezone.
  const date = new Date(`${weekStart}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function groupGroceriesByStore(
  items: GroceryItem[],
): { store: Store; label: string; items: GroceryItem[] }[] {
  return STORES.map((store) => ({
    store,
    label: STORE_LABELS[store],
    items: items.filter((i) => i.store === store),
  }));
}

function renderMealCardHtml(meal: MealPlan["meals"][number]): string {
  const title = escapeHtml(meal.title);
  const kidLine =
    meal.kidVersion !== null
      ? `<div style="margin-top:4px;font-size:13px;color:#5b6470;font-style:italic;">Kid version: ${escapeHtml(meal.kidVersion)}</div>`
      : "";
  const deals =
    meal.dealMatches.length > 0
      ? `<ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#5b6470;">${meal.dealMatches
          .map(
            (d) =>
              `<li>${escapeHtml(d.item)} — ${escapeHtml(d.salePrice)} at ${escapeHtml(d.store)}</li>`,
          )
          .join("")}</ul>`
      : "";
  return `<div style="border:1px solid #e3e6ea;border-radius:6px;padding:12px;margin-bottom:12px;background:#fff;">
  <div style="font-size:16px;font-weight:600;color:#1f2328;">${title}</div>
  ${kidLine}
  ${deals}
</div>`;
}

function renderGroceryGroupHtml(
  group: ReturnType<typeof groupGroceriesByStore>[number],
): string {
  if (group.items.length === 0) return "";
  const rows = group.items
    .map((i) => {
      const dealNote = i.dealMatch
        ? ` <span style="color:#1f7a4d;">(${escapeHtml(i.dealMatch.salePrice)} thru ${escapeHtml(i.dealMatch.validTo)})</span>`
        : "";
      return `<li style="margin-bottom:4px;">${escapeHtml(i.item)} — ${escapeHtml(i.quantity)}${dealNote}</li>`;
    })
    .join("");
  return `<div style="margin-bottom:14px;">
  <div style="font-size:14px;font-weight:600;color:#1f2328;margin-bottom:6px;">${escapeHtml(group.label)}</div>
  <ul style="margin:0;padding-left:18px;font-size:14px;color:#1f2328;">${rows}</ul>
</div>`;
}

function renderMealCardText(meal: MealPlan["meals"][number]): string {
  const lines = [`- ${meal.title}`];
  if (meal.kidVersion !== null) lines.push(`  Kid version: ${meal.kidVersion}`);
  for (const d of meal.dealMatches) {
    lines.push(`  Deal: ${d.item} — ${d.salePrice} at ${d.store}`);
  }
  return lines.join("\n");
}

function renderGroceryGroupText(
  group: ReturnType<typeof groupGroceriesByStore>[number],
): string {
  if (group.items.length === 0) return "";
  const lines = [`${group.label}:`];
  for (const i of group.items) {
    const dealNote = i.dealMatch
      ? ` (${i.dealMatch.salePrice} thru ${i.dealMatch.validTo})`
      : "";
    lines.push(`  - ${i.item} — ${i.quantity}${dealNote}`);
  }
  return lines.join("\n");
}

export function formatMealPlanEmail(
  plan: MealPlan,
  weekStart: string,
): { subject: string; html: string; text: string } {
  const dateLabel = humanDate(weekStart);
  const subject = `Your meal plan — ${dateLabel}`;

  const groceryGroups = groupGroceriesByStore(plan.groceryList);

  const mealsHtml = plan.meals.map(renderMealCardHtml).join("");
  const groceriesHtml = groceryGroups.map(renderGroceryGroupHtml).join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2328;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <h1 style="margin:0 0 4px;font-size:20px;color:#1f2328;">Your meal plan</h1>
  <div style="margin:0 0 18px;font-size:14px;color:#5b6470;">Week of ${escapeHtml(dateLabel)}</div>
  <h2 style="margin:18px 0 10px;font-size:16px;color:#1f2328;">Meals</h2>
  ${mealsHtml}
  <h2 style="margin:22px 0 10px;font-size:16px;color:#1f2328;">Grocery list</h2>
  ${groceriesHtml}
  <div style="margin-top:24px;font-size:12px;color:#8a8f97;">Sent by Meal Assistant.</div>
</div>
</body></html>`;

  const mealsText = plan.meals.map(renderMealCardText).join("\n");
  const groceriesText = groceryGroups
    .map(renderGroceryGroupText)
    .filter((s) => s !== "")
    .join("\n\n");

  const text = [
    `Your meal plan — ${dateLabel}`,
    "",
    "Meals:",
    mealsText,
    "",
    "Grocery list:",
    groceriesText,
    "",
    "Sent by Meal Assistant.",
  ].join("\n");

  return { subject, html, text };
}
