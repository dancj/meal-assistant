"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

export default function DemoBanner() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setDemo(data.demo))
      .catch(() => {});
  }, []);

  if (!demo) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2">
        <FlaskConical className="size-4 shrink-0" />
        <span>
          <strong>Demo mode</strong> — using sample data, no API keys required.
          Data resets on server restart.
          See <code className="bg-amber-100 px-1 rounded text-xs">.env.example</code> to
          connect real services.
        </span>
      </div>
    </div>
  );
}
