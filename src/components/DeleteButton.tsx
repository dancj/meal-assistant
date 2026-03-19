"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeleteButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete recipe");
      }
      router.push("/");
      router.refresh();
    } catch {
      alert("Failed to delete recipe. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      data-testid="delete-btn"
    >
      <Trash2 className="size-3.5" data-icon="inline-start" />
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
