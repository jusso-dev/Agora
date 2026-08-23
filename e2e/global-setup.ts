import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:fs";
import { mkdirSync } from "node:fs";
import { access, writeFile } from "node:fs/promises";

const STATE_FILE = "/tmp/opencode/agora-lightpanda.json";
const CDP = "http://127.0.0.1:9222";

export default async function globalSetup() {
  mkdirSync("/tmp/opencode", { recursive: true });

  if (await cdpUp()) {
    await writeFile(STATE_FILE, JSON.stringify({ started: false }));
    return;
  }

  try {
    await access("./.lightpanda/lightpanda", constants.X_OK);
  } catch {
    throw new Error("Lightpanda is not installed. Run `npm run lightpanda:install`.");
  }

  const proc: ChildProcess = spawn(
    "./.lightpanda/lightpanda",
    ["serve", "--host", "127.0.0.1", "--port", "9222"],
    { stdio: "ignore", detached: false },
  );
  proc.unref();
  await writeFile(STATE_FILE, JSON.stringify({ started: true, pid: proc.pid }));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await cdpUp()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (proc.pid) process.kill(proc.pid, "SIGTERM");
  throw new Error(`Lightpanda CDP not reachable at ${CDP} after 30s`);
}

async function cdpUp() {
  try {
    const res = await fetch(`${CDP}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}
