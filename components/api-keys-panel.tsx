"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type KeyRow = { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string };

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (!cancelled) {
          setKeys(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = () => {
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : []))
      .then(setKeys)
      .catch(() => {});
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setFresh(data.key);
      setName("");
      reload();
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    reload();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name — e.g. claude-code-laptop"
          className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
          Create key
        </button>
      </form>

      {fresh && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">Copy it now — shown once:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-xs">{fresh}</code>
            <CopyButton text={fresh} />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Prefix</th>
              <th className="px-4 py-2.5 font-medium">Last used</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No keys yet. Agents authenticate with these.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">{k.prefix}…</td>
                  <td className="px-4 py-2.5 text-xs text-neutral-400">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => revoke(k.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
