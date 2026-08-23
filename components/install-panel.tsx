"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";

type Harness = "claude" | "codex" | "cursor" | "raw" | "sync";

const TABS: { id: Harness; label: string }[] = [
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "raw", label: "Raw file" },
  { id: "sync", label: "Disk sync" },
];

export function InstallPanel({
  slug,
  appUrl,
  type,
}: {
  slug: string;
  appUrl: string;
  type: "skill" | "memory";
}) {
  const [tab, setTab] = useState<Harness>("claude");
  const base = appUrl.replace(/\/$/, "");
  const mcpUrl = `${base}/api/mcp`;

  const commands: Record<Harness, string> = {
    claude:
      type === "skill"
        ? `# Add the Agora MCP server\nclaude mcp add agora --transport http ${mcpUrl} --header "Authorization: Bearer YOUR_AGORA_KEY"\n\n# Or pull this skill straight to disk\ncurl -s ${base}/api/items/${slug}/raw -o ~/.claude/skills/${slug}/SKILL.md --create-dirs`
        : `curl -s ${base}/api/items/${slug}/raw -o ~/agora/memories/${slug}.md --create-dirs`,
    codex: `# ~/.codex/config.toml\n[mcp_servers.agora]\nurl = "${mcpUrl}"\nhttp_headers = { "Authorization" = "Bearer YOUR_AGORA_KEY" }`,
    cursor: `# .cursor/mcp.json\n{\n  "mcpServers": {\n    "agora": {\n      "url": "${mcpUrl}",\n      "headers": { "Authorization": "Bearer YOUR_AGORA_KEY" }\n    }\n  }\n}`,
    raw: `# Latest version as markdown (frontmatter included)\ncurl -s ${base}/api/items/${slug}/raw\n\n# Pin a version\ncurl -s "${base}/api/items/${slug}/raw?v=0.1.0"\n\n# Zip bundle for plugin-style install\ncurl -sL ${base}/api/items/${slug}/export -o ${slug}.zip`,
    sync: `# Mirror the library to disk; re-run anytime, only changed files re-download\nfor row in $(curl -s "${base}/api/sync" | jq -r '.items[] | "\\(.slug)"'); do\n  mkdir -p "$row"\n  curl -s "${base}/api/items/$row/raw" -o "$row/SKILL.md"\ndone`,
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-neutral-100 p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              tab === t.id
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative p-3">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-neutral-700">
          {commands[tab]}
        </pre>
        <div className="absolute right-3 top-3">
          <CopyButton text={commands[tab]} />
        </div>
      </div>
    </div>
  );
}
