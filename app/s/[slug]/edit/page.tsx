import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getItemBySlug, getVersionContent } from "@/lib/items";
import { VersionForm } from "@/components/version-form";

export default function EditPage({ params }: PageProps<"/s/[slug]/edit">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-neutral-100" />}>
      <EditContent params={params} />
    </Suspense>
  );
}

async function EditContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const item = await getItemBySlug(slug, session.user.id);
  if (!item) notFound();
  if (item.authorId !== session.user.id) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Only the author ({item.authorName}) can publish new versions. Suggest improvements via usage
        traces instead.
      </div>
    );
  }
  const latest = await getVersionContent(item.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every improvement ships as a versioned release with a changelog.
        </p>
      </header>
      <VersionForm slug={slug} currentVersion={item.currentVersion} content={latest?.content ?? ""} />
    </div>
  );
}
