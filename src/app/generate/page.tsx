"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { StoredMealPlan } from "@/lib/storage/types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function GeneratePlanPage() {
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StoredMealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [secret, setSecret] = useState("");

  // Check if auth is required by attempting a preflight
  useEffect(() => {
    const saved = localStorage.getItem("meal-assistant-secret");
    if (saved) setSecret(saved);
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    setEmailSent(false);
    setIsDemo(false);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (secret) {
        headers["Authorization"] = `Bearer ${secret}`;
      }

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers,
        body: JSON.stringify(
          preferences.trim() ? { preferences: preferences.trim() } : {}
        ),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        setError("Authentication required. Enter the CRON_SECRET below.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      // Auth succeeded — save the secret for next time
      if (secret) {
        localStorage.setItem("meal-assistant-secret", secret);
      }
      setNeedsAuth(false);

      const data = await res.json();
      setPlan(data.plan);
      setEmailSent(data.emailSent ?? false);
      setIsDemo(data.demo ?? false);
      toast.success("Meal plan generated!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
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
        <Label htmlFor="preferences">
          Dietary preferences{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g., No red meat this week, kid-friendly options preferred..."
          className="min-h-[80px] resize-y"
          maxLength={500}
          disabled={loading}
        />

        {/* Auth secret input — shown when needed */}
        {needsAuth && (
          <div className="space-y-1">
            <Label htmlFor="secret">API Secret</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter CRON_SECRET..."
            />
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading}
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
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive p-4 text-sm">
          {error}
        </div>
      )}

      <Separator />

      {/* Plan display */}
      {plan && (
        <div className="space-y-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              Week of {plan.weekOf}
            </Badge>
            {isDemo && (
              <Badge variant="secondary" className="bg-warning/15 text-warning">
                Demo plan (no Gemini)
              </Badge>
            )}
            {emailSent && (
              <Badge variant="secondary" className="bg-success/15 text-success">
                Email sent
              </Badge>
            )}
          </div>

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
                        <span className="text-muted-foreground">
                          {item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
