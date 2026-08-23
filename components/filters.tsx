"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

type Option = { value: string; label: string };

const TYPES: Option[] = [
  { value: "", label: "All types" },
  { value: "skill", label: "Skills" },
  { value: "memory", label: "Memories" },
];
const LEVELS: Option[] = [
  { value: "", label: "Any level" },
  { value: "starter", label: "Starter" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const SORTS: Option[] = [
  { value: "rank", label: "Best ranked" },
  { value: "new", label: "Newest" },
  { value: "used", label: "Most used" },
];

export function Filters({ teams, tags }: { teams: Option[]; tags: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [prevParams, setPrevParams] = useState(searchParams.toString());
  if (prevParams !== searchParams.toString()) {
    setPrevParams(searchParams.toString());
    setQ(searchParams.get("q") ?? "");
  }

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => router.push(`/?${params.toString()}`));
    },
    [router, searchParams],
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update("q", q.trim());
        }}
        className="min-w-56 flex-1"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search skills & memories…"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
      </form>
      <Select value={searchParams.get("type") ?? ""} options={TYPES} onChange={(v) => update("type", v)} />
      <Select
        value={searchParams.get("level") ?? ""}
        options={LEVELS}
        onChange={(v) => update("level", v)}
      />
      <Select
        value={searchParams.get("team") ?? ""}
        options={[{ value: "", label: "All teams" }, ...teams]}
        onChange={(v) => update("team", v)}
      />
      <Select
        value={searchParams.get("tag") ?? ""}
        options={[{ value: "", label: "All tags" }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]}
        onChange={(v) => update("tag", v)}
      />
      <Select value={searchParams.get("sort") ?? "rank"} options={SORTS} onChange={(v) => update("sort", v)} />
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-400"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
