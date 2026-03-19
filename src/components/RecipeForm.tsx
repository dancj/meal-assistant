"use client";

import { useState } from "react";
import { Plus, X, ChefHat, Tag, Clock, Link2, NotebookPen, ShoppingBasket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Recipe, Ingredient } from "@/types/recipe";

export interface RecipeFormData {
  name: string;
  ingredients: Ingredient[];
  instructions: string | null;
  tags: string[];
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  source_url: string | null;
  notes: string | null;
}

interface RecipeFormProps {
  initialData?: Recipe;
  onSubmit: (data: RecipeFormData) => Promise<void>;
  submitLabel: string;
}

function emptyIngredient(): Ingredient {
  return { name: "", quantity: "", unit: "" };
}

export default function RecipeForm({
  initialData,
  onSubmit,
  submitLabel,
}: RecipeFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients.length ? initialData.ingredients : [emptyIngredient()]
  );
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
  const [tagsInput, setTagsInput] = useState(initialData?.tags.join(", ") ?? "");
  const [servings, setServings] = useState(initialData?.servings?.toString() ?? "");
  const [prepTime, setPrepTime] = useState(initialData?.prep_time?.toString() ?? "");
  const [cookTime, setCookTime] = useState(initialData?.cook_time?.toString() ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= 1) return;
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Recipe name is required.");
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      setError("At least one ingredient with a name is required.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const data: RecipeFormData = {
      name: trimmedName,
      ingredients: validIngredients.map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity.trim(),
        unit: i.unit.trim(),
      })),
      instructions: instructions.trim() || null,
      tags,
      servings: servings ? parseInt(servings, 10) : null,
      prep_time: prepTime ? parseInt(prepTime, 10) : null,
      cook_time: cookTime ? parseInt(cookTime, 10) : null,
      source_url: sourceUrl.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive" data-testid="form-error">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken Stir Fry"
          data-testid="recipe-name-input"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label><ShoppingBasket className="size-3.5 text-primary/70 inline mr-1.5" />Ingredients *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredient}
            data-testid="add-ingredient-btn"
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            Add ingredient
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-start" data-testid="ingredient-row">
              <Input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                className="flex-1"
                placeholder="Ingredient name"
                aria-label={`Ingredient ${i + 1} name`}
              />
              <Input
                type="text"
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                className="w-20"
                placeholder="Qty"
                aria-label={`Ingredient ${i + 1} quantity`}
              />
              <Input
                type="text"
                value={ing.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                className="w-20"
                placeholder="Unit"
                aria-label={`Ingredient ${i + 1} unit`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeIngredient(i)}
                disabled={ingredients.length <= 1}
                aria-label={`Remove ingredient ${i + 1}`}
                data-testid="remove-ingredient-btn"
              >
                <X className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions"><ChefHat className="size-3.5 text-primary/70 inline mr-1.5" />Instructions</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="min-h-[100px]"
          placeholder="Step-by-step cooking instructions..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags"><Tag className="size-3.5 text-primary/70 inline mr-1.5" />Tags</Label>
        <Input
          id="tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. dinner, quick, vegetarian (comma-separated)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 bg-accent/50 rounded-xl p-4 -mx-1">
        <div className="space-y-2">
          <Label htmlFor="servings"><Clock className="size-3.5 text-primary/70 inline mr-1.5" />Servings</Label>
          <Input
            id="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            data-testid="recipe-servings-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prepTime">Prep (min)</Label>
          <Input
            id="prepTime"
            type="number"
            min="0"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTime">Cook (min)</Label>
          <Input
            id="cookTime"
            type="number"
            min="0"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceUrl"><Link2 className="size-3.5 text-primary/70 inline mr-1.5" />Source URL</Label>
        <Input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes"><NotebookPen className="size-3.5 text-primary/70 inline mr-1.5" />Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px]"
          placeholder="Any extra notes..."
        />
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={submitting} data-testid="submit-btn">
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
