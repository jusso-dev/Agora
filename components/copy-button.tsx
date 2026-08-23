"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
