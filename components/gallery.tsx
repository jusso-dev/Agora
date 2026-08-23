import Link from "next/link";
import { Filters } from "@/components/filters";
import { ItemCard } from "@/components/item-card";
import { listItems, listTags, listTeams, type ListFilters as Query } from "@/lib/items";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function Gallery({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user.id;

  const query: Query = {
    q: str(sp.q),
    type: str(sp.type) === "skill" || str(sp.type) === "memory" ? (str(sp.type) as "skill" | "memory") : undefined,
    team: str(sp.team),
    tag: str(sp.tag),
    level: (["starter", "intermediate", "advanced"].includes(str(sp.level) ?? "")
      ? str(sp.level)
      : undefined) as Query["level"],
    sort: (["rank", "new", "used"].includes(str(sp.sort) ?? "") ? str(sp.sort) : undefined) as Query["sort"],
    viewerId,
  };

  const [items, teams, tags] = await Promise.all([listItems(query), listTeams(), listTags()]);

  const totalUses = items.reduce((sum, i) => sum + i.usageCount, 0);
  const skills = items.filter((i) => i.type === "skill").length;
  const memories = items.length - skills;

  return (
    <>
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-white px-4 py-3 text-sm text-neutral-500 ring-1 ring-neutral-200">
        <Stat value={items.length} label="items" />
        <Stat value={skills} label="skills" />
        <Stat value={memories} label="memories" />
        <Stat value={totalUses} label="agent uses logged" />
        <Link
          href="/docs"
          className="ml-auto font-medium text-neutral-900 underline underline-offset-4 hover:no-underline"
        >
          Connect your agents →
        </Link>
      </div>

      <Filters teams={teams.map((t) => ({ value: t.slug, label: t.name }))} tags={tags} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-sm text-neutral-500">
            Nothing matches. Publish the thing you wish existed.
          </p>
          <Link
            href="/new"
            className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Publish an item
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <strong className="font-semibold text-neutral-900">{value}</strong> {label}
    </span>
  );
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v || undefined;
}
