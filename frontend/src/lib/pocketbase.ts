import PocketBase from "pocketbase";
import { appConfig } from "@/lib/config";
import type { TypedPocketBase } from "@/lib/pocketbase-types";

declare global {
  var __pocketbase__: TypedPocketBase | undefined;
}

export const pocketbaseUrl = appConfig.publicPocketBaseUrl;

export const pb =
  globalThis.__pocketbase__ ??
  (new PocketBase(pocketbaseUrl) as TypedPocketBase);

pb.autoCancellation(false);

if (!globalThis.__pocketbase__) {
  globalThis.__pocketbase__ = pb;
}
