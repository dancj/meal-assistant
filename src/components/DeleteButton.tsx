"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
