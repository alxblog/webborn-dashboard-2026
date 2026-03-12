declare global {
  interface Window {
    __APP_CONFIG__?: {
      publicPocketBaseUrl?: string;
    };
  }
}

export async function loadRuntimeConfig() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const response = await fetch("/app-config.js", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const scriptContent = await response.text();
    globalThis.eval?.(scriptContent);
  } catch {
    // Runtime config is optional. Fall back to bundled values or host inference.
  }
}

function readEnvValue(name: string) {
  const processEnv =
    typeof globalThis !== "undefined" &&
    "process" in globalThis &&
    typeof globalThis.process === "object" &&
    globalThis.process &&
    "env" in globalThis.process &&
    typeof globalThis.process.env === "object"
      ? globalThis.process.env
      : undefined;

  const importMetaEnv =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env === "object" &&
    import.meta.env
      ? import.meta.env
      : undefined;

  const value =
    processEnv?.[name] ||
    importMetaEnv?.[name as keyof typeof importMetaEnv];

  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getPublicPocketBaseUrl() {
  if (typeof window !== "undefined") {
    const runtimeConfiguredUrl = window.__APP_CONFIG__?.publicPocketBaseUrl?.trim();

    if (runtimeConfiguredUrl) {
      return normalizeUrl(runtimeConfiguredUrl);
    }
  }

  const configuredUrl =
    readEnvValue("PUBLIC_POCKETBASE_URL") ||
    readEnvValue("POCKETBASE_URL");

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (typeof window === "undefined") {
    return "http://localhost:8090";
  }

  return normalizeUrl(`${window.location.protocol}//localhost:8090`);
}

export const appConfig = {
  publicPocketBaseUrl: getPublicPocketBaseUrl(),
} as const;
