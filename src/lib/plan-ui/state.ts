import type { Deal } from "@/lib/deals/types";
import type { MealLog } from "@/lib/log/types";
import type { Recipe } from "@/lib/recipes/types";
import type { MealPlan } from "@/lib/plan/types";
import { REQUIRED_MEAL_COUNT } from "@/lib/plan/types";

export type Thumb = "up" | "down" | null;

export type PlanState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      recipes: Recipe[];
      deals: Deal[];
      recentLogs: MealLog[];
      plan: MealPlan;
      generating: boolean;
      currentWeek: string;
      thumbs: Thumb[];
      skipReason: string;
    };

export type PlanAction =
  | {
      type: "INIT_OK";
      recipes: Recipe[];
      deals: Deal[];
      recentLogs: MealLog[];
      plan: MealPlan;
      currentWeek: string;
    }
  | { type: "INIT_FAILED"; error: string }
  | { type: "REGEN_STARTED" }
  | { type: "REGEN_OK"; plan: MealPlan }
  | { type: "REGEN_FAILED"; error: string }
  | { type: "SWAP_STARTED" }
  | { type: "SWAP_OK"; index: number; plan: MealPlan }
  | { type: "SWAP_FAILED"; error: string }
  | { type: "SET_THUMB"; index: number; value: Thumb }
  | { type: "SET_SKIP_REASON"; reason: string }
  | { type: "RETRY" };

export const initialState: PlanState = { status: "loading" };

const blankThumbs = (): Thumb[] => Array(REQUIRED_MEAL_COUNT).fill(null);

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (state.status) {
    case "loading": {
      if (action.type === "INIT_OK") {
        return {
          status: "ready",
          recipes: action.recipes,
          deals: action.deals,
          recentLogs: action.recentLogs,
          plan: action.plan,
          generating: false,
          currentWeek: action.currentWeek,
          thumbs: blankThumbs(),
          skipReason: "",
        };
      }
      if (action.type === "INIT_FAILED") {
        return { status: "error", error: action.error };
      }
      return state;
    }
    case "error": {
      if (action.type === "RETRY") {
        return { status: "loading" };
      }
      if (action.type === "INIT_OK") {
        return {
          status: "ready",
          recipes: action.recipes,
          deals: action.deals,
          recentLogs: action.recentLogs,
          plan: action.plan,
          generating: false,
          currentWeek: action.currentWeek,
          thumbs: blankThumbs(),
          skipReason: "",
        };
      }
      return state;
    }
    case "ready": {
      switch (action.type) {
        case "REGEN_STARTED":
        case "SWAP_STARTED":
          return { ...state, generating: true };
        case "REGEN_OK":
          // New plan = clear all thumbs (they referred to the old meals).
          return {
            ...state,
            plan: action.plan,
            generating: false,
            thumbs: blankThumbs(),
          };
        case "SWAP_OK": {
          if (
            action.index < 0 ||
            action.index >= REQUIRED_MEAL_COUNT ||
            action.plan.meals.length === 0
          ) {
            return { ...state, generating: false };
          }
          const nextMeals = state.plan.meals.slice();
          nextMeals[action.index] = action.plan.meals[0];
          // The swapped slot's thumb no longer applies; clear just that slot.
          const nextThumbs = state.thumbs.slice();
          nextThumbs[action.index] = null;
          return {
            ...state,
            plan: {
              meals: nextMeals,
              groceryList: action.plan.groceryList,
            },
            thumbs: nextThumbs,
            generating: false,
          };
        }
        case "REGEN_FAILED":
        case "SWAP_FAILED":
          return { ...state, generating: false };
        case "SET_THUMB": {
          if (action.index < 0 || action.index >= REQUIRED_MEAL_COUNT) {
            return state;
          }
          const nextThumbs = state.thumbs.slice();
          nextThumbs[action.index] = action.value;
          return { ...state, thumbs: nextThumbs };
        }
        case "SET_SKIP_REASON":
          return { ...state, skipReason: action.reason };
        default:
          return state;
      }
    }
  }
}

export function thumbsToLog(
  state: Extract<PlanState, { status: "ready" }>,
): { week: string; cooked: string[]; skipped: string[]; skipReason?: string } {
  const cooked: string[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < state.thumbs.length; i++) {
    const meal = state.plan.meals[i];
    if (!meal) continue;
    const t = state.thumbs[i];
    if (t === "up") cooked.push(meal.title);
    else if (t === "down") skipped.push(meal.title);
  }
  const out: ReturnType<typeof thumbsToLog> = {
    week: state.currentWeek,
    cooked,
    skipped,
  };
  const reason = state.skipReason.trim();
  if (reason !== "") out.skipReason = reason;
  return out;
}
