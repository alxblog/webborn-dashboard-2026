import { serve } from "bun";
import index from "./index.html";

const port = Number(process.env.PORT || "3000");
const hostname = process.env.HOST || "0.0.0.0";

function readPublicEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function buildRuntimeConfigScript() {
  const publicPocketBaseUrl =
    readPublicEnv("PUBLIC_POCKETBASE_URL") || readPublicEnv("POCKETBASE_URL");

  return `window.__APP_CONFIG__ = ${JSON.stringify({
    publicPocketBaseUrl,
  })};`;
}

const server = serve({
  port,
  hostname,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/app-config.js": {
      async GET() {
        return new Response(buildRuntimeConfigScript(), {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
