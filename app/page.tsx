import { Suspense } from "react";
import { Gallery } from "@/components/gallery";

export const instant = true;

export default function HomePage(props: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          The organisation&apos;s living library of{" "}
          <span className="text-blue-600">skills</span> and{" "}
          <span className="text-purple-600">memories</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">
          Not a folder 10% of the company opens. Proven items rise to the top, quality is measured
          with evals, and every agent consumes the library over MCP.
        </p>
      </section>

      <Suspense fallback={<GallerySkeleton />}>
        <Gallery searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
