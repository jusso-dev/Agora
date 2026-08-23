import Link from "next/link";
import type { ItemRow } from "@/lib/items";

const typeStyles = {
  skill: "bg-blue-50 text-blue-700 border-blue-200",
  memory: "bg-purple-50 text-purple-700 border-purple-200",
} as const;

const levelStyles = {
  starter: "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  advanced: "bg-rose-50 text-rose-700 border-rose-200",
} as const;

export function ItemCard({ item }: { item: ItemRow }) {
  const successRate = item.usageCount ? Math.round((item.successCount / item.usageCount) * 100) : null;
  return (
    <Link
      href={`/s/${item.slug}`}
      prefetch
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px]">
        <span className={`rounded-full border px-2 py-0.5 font-medium ${typeStyles[item.type]}`}>
          {item.type}
        </span>
        <span className={`rounded-full border px-2 py-0.5 capitalize ${levelStyles[item.level]}`}>
          {item.level}
        </span>
        {item.visibility !== "org" && (
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-neutral-500">
            {item.visibility}
          </span>
        )}
        {item.scanStatus === "flagged" && (
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-600">
            flagged
          </span>
        )}
      </div>
      <h3 className="font-semibold text-neutral-900 group-hover:underline group-hover:underline-offset-2">
        {item.title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-neutral-500">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {item.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
            #{tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-400">
        <span title="Rank score">{item.score.toFixed(2)}</span>
        <span title="Total uses">{item.usageCount} uses</span>
        {successRate !== null && (
          <span className={successRate >= 70 ? "text-emerald-600" : successRate < 40 ? "text-red-500" : ""}>
            {successRate}% success
          </span>
        )}
        <span className="ml-auto font-mono text-[11px]">v{item.currentVersion}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-400">
        <span>{item.authorName}</span>
        {item.teamName && <span className="text-neutral-500">{item.teamName}</span>}
      </div>
    </Link>
  );
}
