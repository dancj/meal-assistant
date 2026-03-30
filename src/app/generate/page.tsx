"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ShoppingCart, UtensilsCrossed } from "lucide-react";
import type { StoredMealPlan } from "@/lib/storage/types";

export default function GeneratePlanPage() {
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StoredMealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    setEmailSent(false);
    setIsDemo(false);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          preferences.trim() ? { preferences: preferences.trim() } : {}
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setPlan(data.plan);
      setEmailSent(data.emailSent ?? false);
      setIsDemo(data.demo ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Meal Plan</h1>
        <p className="text-muted-foreground mt-1">
          Select 5 dinners for the week from your recipe library.
        </p>
      </div>

      {/* Input section */}
      <div className="space-y-3">
        <label htmlFor="preferences" className="text-sm font-medium">
          Dietary preferences{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g., No red meat this week, kid-friendly options preferred..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
          maxLength={500}
          disabled={loading}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:bg-primary/80 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : plan ? (
            <>
              <RefreshCw className="size-4" />
              Regenerate
            </>
          ) : (
            <>
              <UtensilsCrossed className="size-4" />
              Generate Plan
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Plan display */}
      {plan && (
        <div className="space-y-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-medium">
              Week of {plan.weekOf}
            </span>
            {isDemo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                Demo plan (no Gemini)
              </span>
            )}
            {emailSent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
                Email sent
              </span>
            )}
          </div>

          {/* Dinners */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Dinners</h2>
            <div className="space-y-2">
              {plan.dinners.map((dinner) => (
                <div
                  key={dinner.day}
                  className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 shrink-0">
                        {dinner.day}
                      </span>
                      <span className="font-medium">{dinner.recipeName}</span>
                    </div>
                    {dinner.alternativeNote && (
                      <p className="text-xs text-muted-foreground mt-1 ml-26">
                        {dinner.alternativeNote}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {dinner.servings} servings
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Grocery list */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Grocery List
            </h2>
            <div className="rounded-lg border bg-card">
              <ul className="divide-y">
                {plan.groceryList.map((item, i) => (
                  <li
                    key={i}
                    className="px-4 py-2 flex items-center justify-between text-sm"
                  >
                    <span>{item.item}</span>
                    <span className="text-muted-foreground">
                      {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
