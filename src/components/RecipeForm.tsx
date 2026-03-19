"use client";

import { useState } from "react";
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

  const inputClass =
    "w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400" data-testid="form-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Chicken Stir Fry"
          data-testid="recipe-name-input"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Ingredients *</span>
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            data-testid="add-ingredient-btn"
          >
            + Add ingredient
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-start" data-testid="ingredient-row">
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="Ingredient name"
                aria-label={`Ingredient ${i + 1} name`}
              />
              <input
                type="text"
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                className={`${inputClass} w-20`}
                placeholder="Qty"
                aria-label={`Ingredient ${i + 1} quantity`}
              />
              <input
                type="text"
                value={ing.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                className={`${inputClass} w-20`}
                placeholder="Unit"
                aria-label={`Ingredient ${i + 1} unit`}
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                disabled={ingredients.length <= 1}
                className="px-2 py-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Remove ingredient ${i + 1}`}
                data-testid="remove-ingredient-btn"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium mb-1">
          Instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className={`${inputClass} min-h-[100px]`}
          placeholder="Step-by-step cooking instructions..."
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-1">
          Tags
        </label>
        <input
          id="tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className={inputClass}
          placeholder="e.g. dinner, quick, vegetarian (comma-separated)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="servings" className="block text-sm font-medium mb-1">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className={inputClass}
            data-testid="recipe-servings-input"
          />
        </div>
        <div>
          <label htmlFor="prepTime" className="block text-sm font-medium mb-1">
            Prep (min)
          </label>
          <input
            id="prepTime"
            type="number"
            min="0"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cookTime" className="block text-sm font-medium mb-1">
            Cook (min)
          </label>
          <input
            id="cookTime"
            type="number"
            min="0"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="sourceUrl" className="block text-sm font-medium mb-1">
          Source URL
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} min-h-[60px]`}
          placeholder="Any extra notes..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-foreground text-background px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          data-testid="submit-btn"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
