import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const binaryName = process.platform === "win32" ? "pocketbase.exe" : "pocketbase";
const binaryPath = path.resolve(process.cwd(), "backend", binaryName);
const envPath = path.resolve(process.cwd(), ".env");
const pbDataDir = path.resolve(process.cwd(), "backend", "pb_data");

if (!existsSync(binaryPath)) {
  console.error(`PocketBase binary not found at ${binaryPath}`);
  console.error("Run `bun run install:pocketbase` first.");
  process.exit(1);
}

function loadDotEnv() {
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function shouldManageSuperuser(args: string[]) {
  return args[0] === "serve";
}

async function ensureSuperuser() {
  const email = process.env.PB_SUPERUSER_EMAIL;
  const password = process.env.PB_SUPERUSER_PASSWORD;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    console.error("PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must both be set.");
    process.exit(1);
  }

  console.log(`Ensuring PocketBase superuser exists for ${email}`);

  const upsertProcess = Bun.spawn({
    cmd: [binaryPath, "superuser", "upsert", email, password, `--dir=${pbDataDir}`],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await upsertProcess.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

loadDotEnv();

const args = process.argv.slice(2);

if (shouldManageSuperuser(args)) {
  await ensureSuperuser();
}

const subprocess = Bun.spawn({
  cmd: [binaryPath, ...args],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await subprocess.exited;
process.exit(exitCode);
