"use client";

import { useActionState, useEffect, useState } from "react";
import { createItemAction, type FormState } from "@/lib/actions";
import Link from "next/link";

type TeamOption = { id: string; name: string };

const SAMPLE = `## When to use
Describe the trigger conditions.

## Steps
1. First do this.
2. Then that.

## Output
What a good result looks like.`;

export function NewItemForm({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createItemAction, {});
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"skill" | "memory">("skill");
  const [similar, setSimilar] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (title.trim().length < 3) {
        setSimilar([]);
        return;
      }
      try {
        const res = await fetch(`/api/items?q=${encodeURIComponent(title.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setSimilar((data.items ?? []).slice(0, 3));
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [title]);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {similar.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">Before you build — these exist:</p>
          <ul className="mt-1 space-y-0.5">
            {similar.map((s) => (
              <li key={s.slug}>
                <Link href={`/s/${s.slug}`} className="underline underline-offset-2">
                  {s.title}
                </Link>{" "}
                <span className="text-amber-600">— consider improving it instead</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Deal review"
            className={inputCls}
          />
        </Field>
        <Field label="Type">
          <div className="flex gap-2">
            {(["skill", "memory"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${
                  type === t
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
        </Field>
      </div>

      <Field label="Description" hint="Shown on cards and to agents searching via MCP.">
        <textarea
          name="description"
          required
          rows={2}
          placeholder="Reviews enterprise contracts against our playbook and flags risky clauses."
          className={inputCls}
        />
      </Field>

      <Field label="Content (markdown)">
        <textarea
          name="content"
          required
          rows={16}
          defaultValue={SAMPLE}
          className={`${inputCls} font-mono text-[13px]`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Level">
          <select name="level" defaultValue="intermediate" className={inputCls}>
            <option value="starter">Starter</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Tags" hint="Comma separated. Include skill level like 'newbies'.">
          <input name="tags" placeholder="sales, review, newbies" className={inputCls} />
        </Field>
        <Field label="Dependencies" hint="Slugs this builds on.">
          <input name="deps" placeholder="contract-playbook" className={inputCls} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visibility">
          <select name="visibility" defaultValue="org" className={inputCls}>
            <option value="org">Whole organisation</option>
            <option value="team">My team only</option>
            <option value="private">Private (just me)</option>
          </select>
        </Field>
        <Field label="Team" hint="Required when visibility is team.">
          <select name="teamId" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish to library"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
