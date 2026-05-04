"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { DealsSidebar } from "@/components/deals-sidebar";
import { EmailButton } from "@/components/email-button";
import { GroceryList } from "@/components/grocery-list";
import { MealRow } from "@/components/meal-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HairlineList } from "@/components/ui/hairline-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanState } from "@/lib/plan-ui/use-plan-state";
import {
  formatWeekRange,
  getMondayOfWeek,
  synthesizeDay,
  weekIssueNumber,
} from "@/lib/week-ui";

export interface HomePageProps {
  emailEnabled: boolean;
}

function LoadingState() {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <aside className="md:col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </aside>
      <section className="md:col-span-8 lg:col-span-9 flex flex-col gap-6">
        <Skeleton className="h-14 w-72" />
        <ol className="border-t border-paper-edge">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="border-b border-paper-edge py-5">
              <Skeleton className="h-20 w-full" />
            </li>
          ))}
        </ol>
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
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePage({ emailEnabled }: HomePageProps) {
  const { state, regenerate, swap, setThumb, setSkipReason, retry } =
    usePlanState();
  // Compute the week start once at mount; stable across re-renders so the
  // Eyebrow's week-range/issue-number doesn't flicker if a render happens
  // to cross midnight UTC.
  const weekStart = useMemo(() => getMondayOfWeek(), []);

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

      <section className="md:col-span-8 lg:col-span-9 flex flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow>
              {formatWeekRange(weekStart)} · Issue {weekIssueNumber(weekStart)}
            </Eyebrow>
            <h1 className="text-display text-ink">
              This week, we&apos;re cooking.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerate}
              disabled={generating}
              aria-label="Regenerate plan"
            >
              <RefreshCw className={generating ? "animate-spin" : undefined} />
              {generating ? "Generating…" : "Regenerate plan"}
            </Button>
            {emailEnabled && <EmailButton plan={plan} disabled={generating} />}
          </div>
        </header>

        <HairlineList as="ol" className="border-t border-paper-edge">
          {plan.meals.map((meal, index) => (
            <MealRow
              key={index}
              row={synthesizeDay(meal, index, weekStart)}
              meal={meal}
              index={index}
              thumb={thumbs[index] ?? null}
              isSwapping={generating}
              actions={{
                onSwap: swap,
                onThumbsUp: (i) => setThumb(i, "up"),
                onThumbsDown: (i) => setThumb(i, "down"),
              }}
            />
          ))}
        </HairlineList>

        {anyDownThumbs && (
          <div
            className="rounded-sm bg-amber-soft text-amber-ink p-3"
            data-testid="skip-reason"
          >
            <Label
              htmlFor="skip-reason-input"
              className="text-body-sm text-amber-ink"
            >
              Why did you skip this week? (optional)
            </Label>
            <Input
              id="skip-reason-input"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g. ran out of time, kid was sick"
              className="mt-1.5 bg-paper"
            />
          </div>
        )}

        <GroceryList items={plan.groceryList} />
      </section>
    </div>
  );
}
