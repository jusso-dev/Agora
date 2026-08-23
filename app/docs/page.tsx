import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Connect your agents" };

const MCP_CONFIG = `{
  "mcpServers": {
    "agora": {
      "url": "APP_URL/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_AGORA_KEY" }
    }
  }
}`;

const CLAUDE_CMD = `claude mcp add agora --transport http APP_URL/api/mcp \\
  --header "Authorization: Bearer YOUR_AGORA_KEY"`;

const SYNC_SH = `#!/bin/sh
# agora-sync.sh — mirror the library to disk; re-run anytime
BASE=APP_URL
DEST="\${1:-$HOME/agora/library}"
mkdir -p "$DEST"
for slug in $(curl -sf "$BASE/api/sync" | jq -r '.items[].slug'); do
  mkdir -p "$DEST/$slug"
  curl -sf "$BASE/api/items/$slug/raw" -o "$DEST/$slug/SKILL.md"
done
echo "synced to $DEST"`;

function Code({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 font-mono text-[12.5px] leading-relaxed">
        {children}
      </pre>
      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Connect anything</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Agora is agent-first: humans browse, agents consume. Three ways in — MCP tools, raw
          markdown over HTTP, or a full disk mirror.
        </p>
      </header>

      <Section title="1 · API key" note="Dashboard → API keys. Agents use it as a Bearer token. Org-visible items also work without a key for raw pulls.">
        <Code>{`curl -s APP_URL/api/items/deal-review/raw`}</Code>
      </Section>

      <Section title="2 · MCP (recommended)" note="Tools: search_items, get_item, record_usage, submit_eval_run, list_updates. Resource: item://{slug}.">
        <Code>{CLAUDE_CMD}</Code>
        <Code>{MCP_CONFIG}</Code>
        <p className="-mt-4 text-xs text-neutral-400">
          The JSON works as-is for Cursor (<code>.cursor/mcp.json</code>) and most MCP clients; for
          Codex put it under <code>[mcp_servers.agora]</code> in <code>~/.codex/config.toml</code>.
        </p>
      </Section>

      <Section title="3 · Disk sync / local folders" note="Skills stay plain folders on disk — Claude Code, Codex and Cursor all read them natively, no reinstall needed per update.">
        <Code>{SYNC_SH}</Code>
        <p className="-mt-4 text-xs text-neutral-400">
          Point your harness at the folder (e.g. symlink into <code>~/.claude/skills/</code>). Re-run
          the script — only changed content re-downloads.
        </p>
      </Section>

      <Section title="Packaging" note="Zip bundle per item with SKILL.md + metadata, ready for plugin-style installs.">
        <Code>{`curl -sL APP_URL/api/items/deal-review/export -o deal-review.zip`}</Code>
      </Section>

      <Section title="The improvement loop" note="What keeps this from becoming a graveyard:">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-600">
          <li>Agents call <code>record_usage</code> after applying guidance → success rates drive ranking.</li>
          <li>Failure notes land in authors&apos; dashboard improvement inbox.</li>
          <li><code>submit_eval_run</code> keeps quality measurable, not vibes.</li>
          <li>Every change is a versioned release; scanner flags secrets &amp; injection patterns.</li>
          <li>Publish form nudges you toward existing items before you build duplicates.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="-mt-1.5 text-sm text-neutral-500">{note}</p>}
      {children}
    </section>
  );
}
