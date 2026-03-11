import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rootDir = process.cwd();
const paths = {
  rootEnvExample: path.join(rootDir, ".env.example"),
  rootEnv: path.join(rootDir, ".env"),
  dockerEnvExample: path.join(rootDir, ".env.docker.example"),
  frontendEnvExample: path.join(rootDir, "frontend", ".env.example"),
  frontendEnv: path.join(rootDir, "frontend", ".env"),
  pocketbaseBinary: path.join(rootDir, "backend", process.platform === "win32" ? "pocketbase.exe" : "pocketbase"),
  pocketbaseDb: path.join(rootDir, "backend", "pb_data", "data.db"),
  generatedTypes: path.join(rootDir, "frontend", "src", "lib", "pocketbase-types.ts"),
} as const;

const isInteractive = Boolean(input.isTTY && output.isTTY);
const rl = isInteractive ? createInterface({ input, output }) : null;

function line(text = "") {
  console.log(text);
}

function section(title: string) {
  line("");
  line(`== ${title} ==`);
}

function info(message: string) {
  line(`[info] ${message}`);
}

function success(message: string) {
  line(`[ok] ${message}`);
}

function warn(message: string) {
  line(`[warn] ${message}`);
}

function fail(message: string) {
  line(`[error] ${message}`);
}

async function exists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function confirm(message: string, defaultValue = true) {
  if (!rl) {
    return defaultValue;
  }

  const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
  const answer = (await rl.question(`${message}${suffix}`)).trim().toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
}

async function ensureFileFromExample(target: string, source: string, label: string) {
  if (await exists(target)) {
    success(`${label} deja present`);
    return;
  }

  if (!(await exists(source))) {
    warn(`Impossible de creer ${label} : exemple introuvable (${path.relative(rootDir, source)})`);
    return;
  }

  const shouldCreate = await confirm(`Creer ${path.relative(rootDir, target)} a partir de ${path.relative(rootDir, source)} ?`);
  if (!shouldCreate) {
    warn(`${label} non cree`);
    return;
  }

  await copyFile(source, target);
  success(`${label} cree`);
}

async function runCommand(command: string[], label: string) {
  info(`${label}`);
  info(`$ ${command.join(" ")}`);

  const proc = Bun.spawn({
    cmd: command,
    cwd: rootDir,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`La commande a echoue avec le code ${exitCode}: ${command.join(" ")}`);
  }
}

async function maybeInstallPocketBase() {
  section("PocketBase");

  if (await exists(paths.pocketbaseBinary)) {
    success("Binaire PocketBase deja installe");
    return;
  }

  const shouldInstall = await confirm("Installer PocketBase maintenant ?");
  if (!shouldInstall) {
    warn("Installation PocketBase ignoree");
    return;
  }

  await runCommand(["bun", "run", "install:pocketbase"], "Installation de PocketBase");
}

async function maybeGenerateTypes() {
  section("Types TypeScript");

  if (!(await exists(paths.pocketbaseDb))) {
    warn("Base SQLite introuvable : impossible de generer les types pour le moment");
    warn("Lance PocketBase et cree ton schema, puis execute `bun run generate:pocketbase-types`.");
    return;
  }

  const hasTypes = await exists(paths.generatedTypes);
  const question = hasTypes
    ? "Regenerer les types PocketBase a partir de backend/pb_data/data.db ?"
    : "Generer les types PocketBase a partir de backend/pb_data/data.db ?";

  const shouldGenerate = await confirm(question);
  if (!shouldGenerate) {
    warn("Generation des types ignoree");
    return;
  }

  await runCommand(["bun", "run", "generate:pocketbase-types"], "Generation des types PocketBase");
}

async function main() {
  line("==============================================");
  line("  Setup local du starter kit PocketBase/Bun");
  line("==============================================");
  line("");
  info("Ce script prepare uniquement l'environnement local.");
  info("Il ne modifie ni Docker ni les workflows de deploiement.");

  section("Configuration");
  await ensureFileFromExample(paths.rootEnv, paths.rootEnvExample, "Fichier .env racine");
  await ensureFileFromExample(paths.frontendEnv, paths.frontendEnvExample, "Fichier frontend/.env");

  if (await exists(paths.dockerEnvExample)) {
    info("Le fichier .env.docker.example est disponible pour la stack Docker.");
  }

  await maybeInstallPocketBase();
  await maybeGenerateTypes();

  section("Termine");
  success("Preparation locale terminee");
  line("");
  line("Prochaines commandes utiles :");
  line("  bun run dev:backend");
  line("  bun run dev:frontend");
  line("  bun run docker:up");
}

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await rl?.close();
}
