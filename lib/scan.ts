type Finding = { rule: string; line: number; excerpt: string };

const RULES: { rule: string; re: RegExp }[] = [
  { rule: "aws-access-key", re: /AKIA[0-9A-Z]{16}/ },
  { rule: "private-key-block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { rule: "github-pat", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { rule: "slack-token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { rule: "openai-style-key", re: /sk-[A-Za-z0-9_-]{20,}/ },
  { rule: "generic-bearer", re: /Bearer\s+[A-Za-z0-9._~+/=-]{32,}/i },
  { rule: "high-entropy-secret", re: /[A-Fa-f0-9]{40,}/ },
];

const INJECTION_RULES: { rule: string; re: RegExp }[] = [
  { rule: "prompt-injection", re: /ignore (all |any )?(previous|prior|above) instructions/i },
  { rule: "exfiltration", re: /(exfiltrate|send|upload|post)\s+(the\s+)?(env|secrets?|credentials?|api[_\s]?keys?)/i },
  { rule: "curl-pipe-shell", re: /curl[^|]*\|\s*(ba)?sh/i },
];

export function scanContent(content: string): {
  status: "clean" | "flagged";
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const { rule, re } of RULES) {
      const m = lines[i].match(re);
      if (m) {
        findings.push({ rule, line: i + 1, excerpt: lines[i].trim().slice(0, 120) });
        break;
      }
    }
    for (const { rule, re } of INJECTION_RULES) {
      const m = lines[i].match(re);
      if (m) {
        findings.push({ rule, line: i + 1, excerpt: lines[i].trim().slice(0, 120) });
        break;
      }
    }
  }
  return { status: findings.length ? "flagged" : "clean", findings };
}
