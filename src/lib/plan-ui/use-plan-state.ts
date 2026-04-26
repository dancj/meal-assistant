"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import {
  fetchDeals,
  fetchRecipes,
  generatePlan,
  ApiError,
} from "@/lib/api/client";
import type { Deal } from "@/lib/deals/types";
import type { Recipe } from "@/lib/recipes/types";
import type { GeneratePlanInput } from "@/lib/plan/types";
import { initialState, planReducer, type PlanState } from "./state";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export interface UsePlanStateResult {
  state: PlanState;
  regenerate: () => void;
  swap: (index: number) => void;
  retry: () => void;
}

export function usePlanState(): UsePlanStateResult {
  const [state, dispatch] = useReducer(planReducer, initialState);

  const initRunRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const runInit = useCallback(async () => {
    let recipes: Recipe[];
    let deals: Deal[];
    try {
      [recipes, deals] = await Promise.all([fetchRecipes(), fetchDeals()]);
    } catch (err) {
      dispatch({ type: "INIT_FAILED", error: errorMessage(err) });
      return;
    }
    const input: GeneratePlanInput = {
      recipes,
      deals,
      logs: [],
      pantry: [],
    };
    try {
      const plan = await generatePlan(input);
      dispatch({ type: "INIT_OK", recipes, deals, plan });
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
    const { recipes, deals } = current;
    dispatch({ type: "REGEN_STARTED" });
    void generatePlan({ recipes, deals, logs: [], pantry: [] })
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
    const current = stateRef.current;
    if (current.status !== "ready" || current.generating) return;
    const { recipes, deals } = current;
    dispatch({ type: "SWAP_STARTED" });
    void generatePlan({ recipes, deals, logs: [], pantry: [] })
      .then((plan) => {
        dispatch({ type: "SWAP_OK", index, plan });
      })
      .catch((err: unknown) => {
        const msg = errorMessage(err);
        dispatch({ type: "SWAP_FAILED", error: msg });
        toast.error("Couldn't swap meal", { description: msg });
      });
  }, []);

  const retry = useCallback(() => {
    if (stateRef.current.status !== "error") return;
    dispatch({ type: "RETRY" });
    void runInit();
  }, [runInit]);

  return { state, regenerate, swap, retry };
}
