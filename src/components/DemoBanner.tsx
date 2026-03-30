"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";

export default function DemoBanner() {
  const [local, setLocal] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setLocal(data.local))
      .catch(() => {});
  }, []);

  if (!local) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2">
        <HardDrive className="size-4 shrink-0" />
        <span>
          <strong>Local mode</strong> — using local SQLite database. Recipes
          persist across restarts.
          See <code className="bg-amber-100 px-1 rounded text-xs">.env.example</code> to
          connect Supabase.
        </span>
      </div>
    </div>
  );
}
