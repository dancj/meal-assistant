"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import {
  fetchDeals,
  fetchPantry,
  fetchRecentLogs,
  fetchRecipes,
  generatePlan,
  postMealLog,
  ApiError,
} from "@/lib/api/client";
import type { Deal } from "@/lib/deals/types";
import type { MealLog } from "@/lib/log/types";
import type { Pantry } from "@/lib/pantry/types";
import type { Recipe } from "@/lib/recipes/types";
import type { GeneratePlanInput } from "@/lib/plan/types";
import {
  initialState,
  planReducer,
  thumbsToLog,
  type PlanState,
  type Thumb,
} from "./state";
import { currentWeekStart } from "./week";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export interface UsePlanStateResult {
  state: PlanState;
  regenerate: () => void;
  swap: (index: number) => void;
  closeSwap: () => void;
  applySwap: (index: number, recipe: Recipe) => void;
  setThumb: (index: number, kind: "up" | "down") => void;
  setSkipReason: (reason: string) => void;
  retry: () => void;
}

function logCurrentSnapshot(state: PlanState) {
  if (state.status !== "ready") return;
  const entry = thumbsToLog(state);
  void postMealLog(entry).catch((err: unknown) => {
    toast.error("Couldn't save thumb", { description: errorMessage(err) });
  });
}

export function usePlanState(): UsePlanStateResult {
  const [state, dispatch] = useReducer(planReducer, initialState);

  const initRunRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const runInit = useCallback(async () => {
    const emptyPantry: Pantry = { staples: [], freezer: [] };
    let recipes: Recipe[];
    let deals: Deal[];
    let recentLogs: MealLog[];
    let pantry: Pantry;
    try {
      [recipes, deals, recentLogs, pantry] = await Promise.all([
        fetchRecipes(),
        fetchDeals(),
        fetchRecentLogs(8).catch((err: unknown) => {
          toast.warning("Couldn't load recent logs", {
            description: errorMessage(err),
          });
          return [] as MealLog[];
        }),
        fetchPantry().catch((err: unknown) => {
          toast.warning("Couldn't load pantry", {
            description: errorMessage(err),
          });
          return emptyPantry;
        }),
      ]);
    } catch (err) {
      dispatch({ type: "INIT_FAILED", error: errorMessage(err) });
      return;
    }
    const input: GeneratePlanInput = {
      recipes,
      deals,
      logs: recentLogs,
      pantry,
    };
    try {
      const plan = await generatePlan(input);
      dispatch({
        type: "INIT_OK",
        recipes,
        deals,
        recentLogs,
        pantry,
        plan,
        currentWeek: currentWeekStart(),
      });
    } catch (err) {
      dispatch({ type: "INIT_FAILED", error: errorMessage(err) });
    }
  }, []);

  useEffect(() => {
    if (initRunRef.current) return;
    initRunRef.current = true;
    void runInit();
  }, [runInit]);

  const regenerate = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "ready" || current.generating) return;
    const { recipes, deals, recentLogs, pantry } = current;
    dispatch({ type: "REGEN_STARTED" });
    void generatePlan({ recipes, deals, logs: recentLogs, pantry })
      .then((plan) => {
        dispatch({ type: "REGEN_OK", plan });
      })
      .catch((err: unknown) => {
        const msg = errorMessage(err);
        dispatch({ type: "REGEN_FAILED", error: msg });
        toast.error("Couldn't regenerate plan", { description: msg });
      });
  }, []);

  const swap = useCallback((index: number) => {
    // SwapDrawer flow: opening the drawer is now the only side effect of the
    // Swap button. The actual meal replacement happens in applySwap when the
    // user picks a suggestion.
    dispatch({ type: "OPEN_SWAP_DRAWER", index });
  }, []);

  const closeSwap = useCallback(() => {
    dispatch({ type: "CLOSE_SWAP_DRAWER" });
  }, []);

  const applySwap = useCallback((index: number, recipe: Recipe) => {
    dispatch({ type: "APPLY_SWAP_LOCAL", index, recipe });
  }, []);

  const setThumb = useCallback((index: number, kind: "up" | "down") => {
    const current = stateRef.current;
    if (current.status !== "ready") return;
    const existing = current.thumbs[index];
    const nextValue: Thumb = existing === kind ? null : kind;
    dispatch({ type: "SET_THUMB", index, value: nextValue });
    // Use freshly computed state (post-dispatch) for the POST snapshot.
    logCurrentSnapshot({
      ...current,
      thumbs: current.thumbs.map((t, i) => (i === index ? nextValue : t)),
    });
  }, []);

  const setSkipReason = useCallback((reason: string) => {
    const current = stateRef.current;
    if (current.status !== "ready") return;
    dispatch({ type: "SET_SKIP_REASON", reason });
    logCurrentSnapshot({ ...current, skipReason: reason });
  }, []);

  const retry = useCallback(() => {
    if (stateRef.current.status !== "error") return;
    dispatch({ type: "RETRY" });
    void runInit();
  }, [runInit]);

  return {
    state,
    regenerate,
    swap,
    closeSwap,
    applySwap,
    setThumb,
    setSkipReason,
    retry,
  };
}
