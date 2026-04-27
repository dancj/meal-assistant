"use client";

import { RefreshCw } from "lucide-react";
import { DealsSidebar } from "@/components/deals-sidebar";
import { GroceryList } from "@/components/grocery-list";
import { MealCard } from "@/components/meal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanState } from "@/lib/plan-ui/use-plan-state";

export interface HomePageProps {
  emailEnabled: boolean;
}

function LoadingState() {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <aside className="md:col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </aside>
      <section className="md:col-span-8 lg:col-span-9 flex flex-col gap-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
        <Skeleton className="h-60 w-full" />
      </section>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div>
          <Button onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePage(_props: HomePageProps) {
  const { state, regenerate, swap, setThumb, setSkipReason, retry } =
    usePlanState();

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") {
    return <ErrorState message={state.error} onRetry={retry} />;
  }

  const { deals, plan, generating, thumbs, skipReason } = state;
  const anyDownThumbs = thumbs.some((t) => t === "down");

  return (
    <div className="grid gap-6 md:grid-cols-12">
      <aside className="md:col-span-4 lg:col-span-3 md:sticky md:top-20 md:self-start">
        <DealsSidebar deals={deals} />
      </aside>

      <section className="md:col-span-8 lg:col-span-9 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">This week&apos;s meals</h1>
          <Button
            variant="outline"
            onClick={regenerate}
            disabled={generating}
            aria-label="Regenerate plan"
          >
            <RefreshCw className={generating ? "animate-spin" : undefined} />
            {generating ? "Generating…" : "Regenerate plan"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plan.meals.map((meal, index) => (
            <MealCard
              key={index}
              meal={meal}
              index={index}
              isSwapping={generating}
              thumb={thumbs[index] ?? null}
              onSwap={swap}
              onThumbsUp={(i) => setThumb(i, "up")}
              onThumbsDown={(i) => setThumb(i, "down")}
            />
          ))}
        </div>

        {anyDownThumbs && (
          <div
            className="rounded-md bg-muted/40 p-3 ring-1 ring-foreground/5"
            data-testid="skip-reason"
          >
            <Label
              htmlFor="skip-reason-input"
              className="text-sm text-muted-foreground"
            >
              Why did you skip this week? (optional)
            </Label>
            <Input
              id="skip-reason-input"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g. ran out of time, kid was sick"
              className="mt-1.5"
            />
          </div>
        )}

        <GroceryList items={plan.groceryList} />
      </section>
    </div>
  );
}
