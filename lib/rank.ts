import type { Item } from "@/db/schema";

const HALF_LIFE_DAYS = 45;

export function rankItem(
  row: Pick<Item, "usageCount" | "successCount" | "updatedAt">,
  stats: { evalPassRate: number },
) {
  const { usageCount, successCount, updatedAt } = row;
  const successRate = usageCount > 0 ? successCount / usageCount : 0.5;
  const days = Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const recency = Math.pow(0.5, days / HALF_LIFE_DAYS);
  const volume = Math.log10(1 + usageCount) / 3;
  const score =
    0.45 * successRate + 0.25 * stats.evalPassRate + 0.2 * Math.min(1, volume) + 0.1 * recency;
  return Math.round(score * 1000) / 1000;
}
