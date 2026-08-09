interface Env {
  ASSETS: R2Bucket;
}

type ReleaseAsset = { name: string; browser_download_url: string };
type ReleaseJson = { assets?: ReleaseAsset[] };

const HTML = "text/html; charset=utf-8";
const JSON_CT = "application/json; charset=utf-8";

function contentType(key: string, stored?: string): string {
  if (stored) return stored;
  if (key.endsWith(".html")) return HTML;
  if (key.endsWith(".json")) return JSON_CT;
  if (key.endsWith(".css")) return "text/css; charset=utf-8";
  if (key.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (key.endsWith(".svg")) return "image/svg+xml";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".xml")) return "application/xml";
  if (key.endsWith(".txt") || key.endsWith(".sh")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function cacheControl(key: string): string {
  if (key.startsWith("_astro/")) return "public, max-age=31536000, immutable";
  if (key === "latest.json" || key === "release.json") return "public, max-age=300";
  if (key.endsWith(".html")) return "public, max-age=300";
  return "public, max-age=3600";
}

function keysForPath(pathname: string): string[] {
  let path = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (path.endsWith("/")) path = path.slice(0, -1);
  if (!path) return ["index.html"];
  return [...new Set([`${path}/index.html`, path])];
}

async function readRelease(env: Env): Promise<ReleaseJson | null> {
  const object = await env.ASSETS.get("release.json");
  if (!object) return null;
  try {
    return JSON.parse(await object.text()) as ReleaseJson;
  } catch {
    return null;
  }
}

function dmgUrlForArch(release: ReleaseJson, arch: "aarch64" | "x64"): string | null {
  for (const asset of release.assets ?? []) {
    const name = asset.name.toLowerCase();
    if (!name.endsWith(".dmg")) continue;
    if (arch === "aarch64" && (name.includes("aarch64") || name.includes("arm64"))) {
      return asset.browser_download_url;
    }
    if (
      arch === "x64" &&
      (name.includes("x64") || name.includes("x86_64") || name.includes("intel"))
    ) {
      return asset.browser_download_url;
    }
  }
  return null;
}

function dmgUrlByFilename(release: ReleaseJson, filename: string): string | null {
  const target = filename.toLowerCase();
  for (const asset of release.assets ?? []) {
    if (asset.name.toLowerCase() === target) return asset.browser_download_url;
  }
  return null;
}

async function handleDownloadRedirect(pathname: string, env: Env): Promise<Response | null> {
  const latest = pathname.match(/^\/download\/latest\/(aarch64|x64|arm64)$/);
  if (latest) {
    const arch = latest[1] === "arm64" ? "aarch64" : (latest[1] as "aarch64" | "x64");
    const release = await readRelease(env);
    if (!release) return new Response("Release metadata unavailable", { status: 503 });
    const url = dmgUrlForArch(release, arch);
    if (!url) return new Response("No macOS build for this architecture", { status: 404 });
    return Response.redirect(url, 302);
  }

  const named = pathname.match(/^\/download\/(Pigeon_[^/]+\.dmg)$/i);
  if (named) {
    const release = await readRelease(env);
    if (!release) return new Response("Release metadata unavailable", { status: 503 });
    const url = dmgUrlByFilename(release, named[1]);
    if (!url) return new Response("Installer not found", { status: 404 });
    return Response.redirect(url, 302);
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { pathname } = new URL(request.url);
    const redirect = await handleDownloadRedirect(pathname, env);
    if (redirect) return redirect;

    for (const key of keysForPath(pathname)) {
      const object = await env.ASSETS.get(key);
      if (!object) continue;

      const headers = new Headers();
      headers.set("Content-Type", contentType(key, object.httpMetadata?.contentType));
      headers.set("Cache-Control", cacheControl(key));
      if (object.httpEtag) headers.set("ETag", object.httpEtag);

      if (request.method === "HEAD") {
        return new Response(null, { status: 200, headers });
      }
      return new Response(object.body, { status: 200, headers });
    }

    const notFound = await env.ASSETS.get("404.html");
    if (notFound) {
      const headers = new Headers({
        "Content-Type": HTML,
        "Cache-Control": "public, max-age=300",
      });
      if (request.method === "HEAD") {
        return new Response(null, { status: 404, headers });
      }
      return new Response(notFound.body, { status: 404, headers });
    }

    return new Response("Not Found", { status: 404 });
  },
};
