import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listTeams } from "@/lib/items";
import { NewItemForm } from "@/components/new-item-form";

export default function NewPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-neutral-100" />}>
      <NewContent />
    </Suspense>
  );
}

async function NewContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const teams = await listTeams();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Publish to the library</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Search first — the form nudges you if something similar exists. Improving beats
          rebuilding.
        </p>
      </header>
      <NewItemForm teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
    </div>
  );
}
