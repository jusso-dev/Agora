"use client";

import { useState, useTransition } from "react";
import { logUsageAction } from "@/lib/actions";

export function UsageButtons({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const log = (outcome: "success" | "partial" | "failure") => {
    startTransition(async () => {
      await logUsageAction({ slug, outcome });
      setDone(true);
    });
  };

  if (done) return <p className="text-xs text-emerald-600">Logged — ranking updated.</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {(["success", "partial", "failure"] as const).map((outcome) => (
        <button
          key={outcome}
          disabled={pending}
          onClick={() => log(outcome)}
          className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors disabled:opacity-50 ${
            outcome === "success"
              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              : outcome === "partial"
                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                : "border-red-200 text-red-600 hover:bg-red-50"
          }`}
        >
          Used · {outcome}
        </button>
      ))}
    </div>
  );
}
