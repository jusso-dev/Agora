"use client";

import { useActionState } from "react";
import { createVersionAction, type FormState } from "@/lib/actions";

export function VersionForm({
  slug,
  currentVersion,
  content,
}: {
  slug: string;
  currentVersion: string;
  content: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createVersionAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-700">Changelog</span>
          <input
            name="changelog"
            placeholder="Tightened clause list, added negotiation fallback"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-700">Bump (now v{currentVersion})</span>
          <select
            name="bump"
            defaultValue="patch"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          >
            <option value="patch">patch</option>
            <option value="minor">minor</option>
            <option value="major">major</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-neutral-700">Content (markdown)</span>
        <textarea
          name="content"
          required
          rows={18}
          defaultValue={content}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-neutral-400"
        />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish new version"}
      </button>
    </form>
  );
}
