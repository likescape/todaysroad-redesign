import { mapTileUrl } from "@/lib/map-tile";
import { readLimitedBody } from "@/lib/server-http";

export async function GET(request: Request) {
  const url = mapTileUrl(new URL(request.url).searchParams.get("url") ?? "");
  if (!url) return new Response("Unsupported map tile", { status: 400 });
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("TILE_FAILED");
    const bytes = await readLimitedBody(response.body, 512_000);
    return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Map tile unavailable", { status: 502 }); }
}
