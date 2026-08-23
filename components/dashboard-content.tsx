import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { item, usageEvent } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiKeysPanel } from "@/components/api-keys-panel";

export async function DashboardContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [mine, recentTraces] = await Promise.all([
    db
      .select({
        slug: item.slug,
        title: item.title,
        type: item.type,
        version: item.currentVersion,
        usageCount: item.usageCount,
        successCount: item.successCount,
        scanStatus: item.scanStatus,
        updatedAt: item.updatedAt,
      })
      .from(item)
      .where(eq(item.authorId, session.user.id))
      .orderBy(desc(item.updatedAt)),
    db
      .select({
        id: usageEvent.id,
        outcome: usageEvent.outcome,
        agent: usageEvent.agent,
        notes: usageEvent.notes,
        createdAt: usageEvent.createdAt,
        slug: item.slug,
        title: item.title,
      })
      .from(usageEvent)
      .innerJoin(item, eq(usageEvent.itemId, item.id))
      .where(and(eq(item.authorId, session.user.id), sql`${usageEvent.notes} <> ''`))
      .orderBy(desc(usageEvent.createdAt))
      .limit(10),
  ]);

  const totalUses = mine.reduce((s, i) => s + i.usageCount, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          {mine.length} published · {totalUses} total uses
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Your items</h2>
        {mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-500">Nothing published yet.</p>
            <Link
              href="/new"
              className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Publish your first item
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Uses</th>
                  <th className="px-4 py-2.5 font-medium">Success</th>
                  <th className="px-4 py-2.5 font-medium">Scan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mine.map((row) => {
                  const rate = row.usageCount
                    ? Math.round((row.successCount / row.usageCount) * 100)
                    : null;
                  return (
                    <tr key={row.slug} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/s/${row.slug}`} className="font-medium hover:underline">
                          {row.title}
                        </Link>
                        <span className="ml-1.5 text-xs text-neutral-400">{row.type}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">v{row.version}</td>
                      <td className="px-4 py-2.5">{row.usageCount}</td>
                      <td
                        className={`px-4 py-2.5 ${
                          rate !== null && rate >= 70
                            ? "text-emerald-600"
                            : rate !== null && rate < 40
                              ? "text-red-500"
                              : ""
                        }`}
                      >
                        {rate === null ? "—" : `${rate}%`}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={row.scanStatus === "flagged" ? "text-red-500" : "text-neutral-400"}>
                          {row.scanStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/s/${row.slug}/edit`} className="text-xs text-blue-600 hover:underline">
                          new version
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Improvement inbox — latest agent notes on your items
        </h2>
        {recentTraces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-400">
            No agent feedback yet.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {recentTraces.map((t) => (
              <div key={t.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/s/${t.slug}`} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                  <span
                    className={`text-xs capitalize ${
                      t.outcome === "success"
                        ? "text-emerald-600"
                        : t.outcome === "failure"
                          ? "text-red-500"
                          : "text-amber-600"
                    }`}
                  >
                    {t.outcome}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-neutral-400">{t.agent}</span>
                </div>
                {t.notes && <p className="mt-1 text-neutral-500">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">API keys for agents</h2>
        <p className="mb-3 text-xs text-neutral-400">
          Agents authenticate to MCP / sync with{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono">Authorization: Bearer agora_…</code>
        </p>
        <ApiKeysPanel />
      </section>
    </div>
  );
}
