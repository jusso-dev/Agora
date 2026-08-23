import { readFile, unlink } from "node:fs/promises";

const STATE_FILE = "/tmp/opencode/agora-lightpanda.json";

export default async function globalTeardown() {
  try {
    const state = JSON.parse(await readFile(STATE_FILE, "utf8")) as {
      started?: boolean;
      pid?: number;
    };
    if (state.started && Number.isInteger(state.pid)) process.kill(state.pid!, "SIGTERM");
    await unlink(STATE_FILE);
  } catch {}
}
