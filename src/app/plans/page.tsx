"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { StoredMealPlan } from "@/lib/storage/types";

function PlanSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function PlanDisplay({ plan }: { plan: StoredMealPlan }) {
  return (
    <Tabs defaultValue="dinners">
      <TabsList>
        <TabsTrigger value="dinners">
          <UtensilsCrossed className="size-4" />
          Dinners
        </TabsTrigger>
        <TabsTrigger value="grocery-list">
          <ShoppingCart className="size-4" />
          Grocery List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dinners">
        <div className="space-y-2 pt-3">
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
      </TabsContent>

      <TabsContent value="grocery-list">
        <div className="pt-3">
          <div className="rounded-lg border bg-card">
            <ul className="divide-y">
              {plan.groceryList.map((item, i) => (
                <li
                  key={i}
                  className="px-4 py-2 flex items-center justify-between text-sm"
                >
                  <span>{item.item}</span>
                  <span className="text-muted-foreground">{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function HistoryItem({ plan }: { plan: StoredMealPlan }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="font-medium">Week of {plan.weekOf}</span>
          <span className="text-xs text-muted-foreground">
            {plan.dinners.map((d) => d.recipeName).join(", ")}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-4">
          <PlanDisplay plan={plan} />
        </div>
      )}
    </Card>
  );
}

export default function PlansPage() {
  const [currentPlan, setCurrentPlan] = useState<StoredMealPlan | null>(null);
  const [pastPlans, setPastPlans] = useState<StoredMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const secret = localStorage.getItem("meal-assistant-secret");
        const headers: Record<string, string> = {};
        if (secret) {
          headers["Authorization"] = `Bearer ${secret}`;
        }

        const [currentRes, historyRes] = await Promise.all([
          fetch("/api/plan/current", { headers }),
          fetch("/api/plans", { headers }),
        ]);

        let current: StoredMealPlan | null = null;
        if (currentRes.ok) {
          current = await currentRes.json();
          setCurrentPlan(current);
        }

        if (historyRes.ok) {
          const allPlans: StoredMealPlan[] = await historyRes.json();
          setPastPlans(
            current ? allPlans.filter((p) => p.id !== current.id) : allPlans
          );
        }
      } catch {
        setError("Failed to load meal plans");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <PlanSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive p-4 text-sm">
        {error}
      </div>
    );
  }

  if (!currentPlan && pastPlans.length === 0) {
    return (
      <div className="text-center py-20">
        <CalendarDays className="size-12 text-primary/30 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground mb-2">No meal plans yet</p>
        <p className="text-sm text-muted-foreground/70 mb-6">
          Generate your first meal plan to see it here.
        </p>
        <Link
          href="/generate"
          className="text-primary hover:underline font-medium text-sm"
        >
          Generate a plan &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meal Plans</h1>
        <p className="text-muted-foreground mt-1">
          View your current and past weekly meal plans.
        </p>
      </div>

      {currentPlan && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Week of {currentPlan.weekOf}
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Current
            </Badge>
          </div>
          <PlanDisplay plan={currentPlan} />
        </div>
      )}

      {pastPlans.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Past Plans
            </h2>
            <div className="space-y-2">
              {pastPlans.map((plan) => (
                <HistoryItem key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
