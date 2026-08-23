import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getItemBySlug, getVersionContent } from "@/lib/items";
import { Markdown } from "@/components/markdown";
import { InstallPanel } from "@/components/install-panel";
import { UsageButtons } from "@/components/usage-buttons";

export const instant = true;

export default function ItemPage({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ItemContent params={params} />
    </Suspense>
  );
}

async function ItemContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user.id;

  const item = await getItemBySlug(slug, viewerId);
  if (!item) notFound();

  const content = (await getVersionContent(item.id)) ?? null;
  const successRate = item.usageCount
    ? Math.round((item.successCount / item.usageCount) * 100)
    : null;
  const isAuthor = viewerId === item.authorId;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <article className="min-w-0 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge
              className={
                item.type === "skill"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }
            >
              {item.type}
            </Badge>
            <Badge className="border-neutral-200 bg-neutral-50 text-neutral-500 capitalize">
              {item.level}
            </Badge>
            {item.visibility !== "org" && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">{item.visibility}</Badge>
            )}
            <Badge
              className={
                item.scanStatus === "clean"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : item.scanStatus === "flagged"
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
              }
            >
              scan: {item.scanStatus}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h1>
          <p className="text-neutral-500">{item.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>
              by <strong className="font-medium text-neutral-600">{item.authorName}</strong>
            </span>
            {item.teamName && <span>· {item.teamName}</span>}
            <span>· updated {new Date(item.updatedAt).toLocaleDateString()}</span>
            {item.tags.map((t) => (
              <Link
                key={t}
                href={`/?tag=${t}`}
                className="rounded bg-neutral-100 px-1.5 py-0.5 hover:bg-neutral-200"
              >
                #{t}
              </Link>
            ))}
          </div>
        </header>

        {content && (
          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <Markdown>{content.content}</Markdown>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700">Versions</h2>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {item.versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-sm">
                <a
                  href={`/api/items/${item.slug}/raw?v=${v.version}`}
                  className="font-mono text-xs text-blue-600 hover:underline"
                >
                  v{v.version}
                </a>
                <span className="flex-1 text-neutral-500">{v.changelog}</span>
                {v.scanStatus === "flagged" && (
                  <span className="text-xs text-red-500">flagged by scanner</span>
                )}
                <span className="text-xs text-neutral-400">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700">Recent traces</h2>
          {item.traces.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-400">
              No usage logged yet. Agents feed outcomes back over MCP.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
              {item.traces.map((t) => (
                <div key={t.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-sm">
                  <OutcomeDot outcome={t.outcome} />
                  <span className="w-24 shrink-0 capitalize text-neutral-600">{t.outcome}</span>
                  <span className="font-mono text-xs text-neutral-400">{t.agent}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-500">{t.notes || "—"}</span>
                  <span className="text-xs text-neutral-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </article>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-center">
          <Metric label="rank" value={item.score.toFixed(2)} />
          <Metric label="uses" value={String(item.usageCount)} />
          <Metric
            label="success"
            value={successRate === null ? "—" : `${successRate}%`}
            tone={
              successRate === null ? undefined : successRate >= 70 ? "good" : successRate < 40 ? "bad" : undefined
            }
          />
        </div>

        <UsageButtons slug={item.slug} />

        <InstallPanel slug={item.slug} appUrl={appUrl} type={item.type} />

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Evals</h2>
          {item.evals.length === 0 ? (
            <p className="text-xs text-neutral-400">No evals defined yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {item.evals.map((e) => {
                const runs = item.evalRuns.filter((r) => r.evalDefId === e.id);
                const passed = runs.filter((r) => r.passed).length;
                return (
                  <li key={e.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-700">{e.name}</span>
                      <span
                        className={
                          runs.length && passed / runs.length >= 0.7
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }
                      >
                        {passed}/{runs.length} pass
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-neutral-400">{e.rubric}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {item.deps.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">Depends on</h2>
            <ul className="space-y-1 text-sm">
              {item.deps.map((d) => (
                <li key={d}>
                  <Link href={`/s/${d}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {d}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAuthor && (
          <Link
            href={`/s/${item.slug}/edit`}
            className="block rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-center text-sm font-medium text-neutral-600 hover:border-neutral-400"
          >
            Publish new version →
          </Link>
        )}
      </aside>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded-full bg-neutral-100" />
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      </div>
      <div className="hidden space-y-4 lg:block">
        <div className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      </div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2 py-0.5 font-medium ${className}`}>{children}</span>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="px-2 py-3">
      <div
        className={`text-lg font-semibold ${
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
    </div>
  );
}

function OutcomeDot({ outcome }: { outcome: string }) {
  const color =
    outcome === "success" ? "bg-emerald-500" : outcome === "partial" ? "bg-amber-500" : "bg-red-500";
  return <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} />;
}
