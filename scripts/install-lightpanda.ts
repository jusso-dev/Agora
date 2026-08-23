import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

const target = new URL("../.lightpanda/lightpanda", import.meta.url);

async function main() {
  try {
    await access(target, constants.X_OK);
    console.log("Lightpanda already installed.");
    return;
  } catch {}

  const platforms: Partial<Record<NodeJS.Platform, string>> = {
    darwin: "macos",
    linux: "linux",
  };
  const architectures: Partial<Record<string, string>> = {
    arm64: "aarch64",
    x64: "x86_64",
  };
  const platform = platforms[process.platform];
  const architecture = architectures[process.arch];

  if (!platform || !architecture) {
    throw new Error(`No Lightpanda nightly for ${process.platform}/${process.arch}.`);
  }

  const url = `https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-${architecture}-${platform}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lightpanda download failed: ${response.status} ${response.statusText}`);
  }

  await mkdir(new URL("../.lightpanda/", import.meta.url), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  await chmod(target, 0o755);
  console.log(`Installed Lightpanda for ${process.platform}/${process.arch}.`);
}

void main();
