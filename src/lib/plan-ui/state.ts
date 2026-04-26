import type { Deal } from "@/lib/deals/types";
import type { MealLog } from "@/lib/log/types";
import type { Recipe } from "@/lib/recipes/types";
import type { MealPlan } from "@/lib/plan/types";
import { REQUIRED_MEAL_COUNT } from "@/lib/plan/types";

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
    };

export type PlanAction =
  | {
      type: "INIT_OK";
      recipes: Recipe[];
      deals: Deal[];
      recentLogs: MealLog[];
      plan: MealPlan;
    }
  | { type: "INIT_FAILED"; error: string }
  | { type: "REGEN_STARTED" }
  | { type: "REGEN_OK"; plan: MealPlan }
  | { type: "REGEN_FAILED"; error: string }
  | { type: "SWAP_STARTED" }
  | { type: "SWAP_OK"; index: number; plan: MealPlan }
  | { type: "SWAP_FAILED"; error: string }
  | { type: "RETRY" };

export const initialState: PlanState = { status: "loading" };

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
          return { ...state, plan: action.plan, generating: false };
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
          return {
            ...state,
            plan: {
              meals: nextMeals,
              groceryList: action.plan.groceryList,
            },
            generating: false,
          };
        }
        case "REGEN_FAILED":
        case "SWAP_FAILED":
          return { ...state, generating: false };
        default:
          return state;
      }
    }
  }
}
