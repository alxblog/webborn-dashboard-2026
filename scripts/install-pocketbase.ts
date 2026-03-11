import { chmod, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const REPO = "pocketbase/pocketbase";
const API_BASE = `https://api.github.com/repos/${REPO}/releases`;
const backendDir = path.resolve(process.cwd(), "backend");

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

type GitHubRelease = {
  tag_name: string;
  assets: GitHubAsset[];
};

function resolveTarget() {
  const platform = process.platform;
  const arch = process.arch;

  const os =
    platform === "darwin"
      ? "darwin"
      : platform === "linux"
        ? "linux"
        : platform === "win32"
          ? "windows"
          : null;

  const targetArch =
    arch === "x64" ? "amd64" : arch === "arm64" ? "arm64" : arch === "ia32" ? "386" : null;

  if (!os || !targetArch) {
    throw new Error(`Unsupported target: ${platform}/${arch}`);
  }

  return { os, arch: targetArch, extension: os === "windows" ? ".exe" : "" };
}

function resolveVersion() {
  const cliVersion = process.argv[2];
  const rawVersion = cliVersion || process.env.PB_VERSION || "latest";

  if (rawVersion === "latest") {
    return rawVersion;
  }

  return rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
}

async function fetchRelease(version: string) {
  const url = version === "latest" ? `${API_BASE}/latest` : `${API_BASE}/tags/${version}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "pocketbase-bun-react-shadcn-starterkit",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PocketBase release metadata (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as GitHubRelease;
}

function selectAsset(release: GitHubRelease, os: string, arch: string) {
  const expectedSuffix = `_${os}_${arch}.zip`;
  const asset = release.assets.find((candidate) => candidate.name.endsWith(expectedSuffix));

  if (!asset) {
    throw new Error(`No PocketBase asset found for ${os}/${arch} in ${release.tag_name}`);
  }

  return asset;
}

async function downloadAsset(url: string, destination: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "pocketbase-bun-react-shadcn-starterkit",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download PocketBase archive (${response.status} ${response.statusText})`);
  }

  await Bun.write(destination, await response.bytes());
}

async function extractArchive(archivePath: string) {
  const tarResult = Bun.spawnSync({
    cmd: ["tar", "-xf", archivePath, "-C", backendDir],
    stdout: "pipe",
    stderr: "pipe",
  });

  if (tarResult.exitCode === 0) {
    return;
  }

  if (process.platform === "win32") {
    const powershellResult = Bun.spawnSync({
      cmd: [
        "powershell",
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${backendDir.replaceAll("'", "''")}' -Force`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    if (powershellResult.exitCode === 0) {
      return;
    }

    throw new Error(new TextDecoder().decode(powershellResult.stderr) || "Failed to extract PocketBase archive");
  }

  throw new Error(new TextDecoder().decode(tarResult.stderr) || "Failed to extract PocketBase archive");
}

async function main() {
  const version = resolveVersion();
  const target = resolveTarget();

  console.log(`Resolving PocketBase release for ${target.os}/${target.arch}...`);

  const release = await fetchRelease(version);
  const asset = selectAsset(release, target.os, target.arch);
  const archivePath = path.join(backendDir, asset.name);
  const binaryPath = path.join(backendDir, `pocketbase${target.extension}`);

  await mkdir(backendDir, { recursive: true });
  await rm(binaryPath, { force: true });

  console.log(`Downloading ${release.tag_name} from ${asset.browser_download_url}`);
  await downloadAsset(asset.browser_download_url, archivePath);

  console.log(`Extracting ${asset.name} into ${backendDir}`);
  await extractArchive(archivePath);
  await rm(archivePath, { force: true });

  if (process.platform !== "win32") {
    await chmod(binaryPath, 0o755);
  }

  console.log(`PocketBase ${release.tag_name} installed at ${binaryPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
