import { ImageRouteError } from "@/lib/map-segmentation";
import { analyzeMapImage } from "@/lib/map-vision";
import { readLimitedBody } from "@/lib/server-http";
import { analyzeMapWithCodex, codexAvailable, CODEX_TIMEOUT_MS } from "@/lib/codex-map-vision";

export const runtime = "nodejs";
export const maxDuration = 320;
const headers = { "Cache-Control": "no-store" };
const unavailable = () => Response.json({ code: "VISION_NOT_CONFIGURED", error: "지도 이미지 분석 서비스가 아직 연결되지 않았어요." }, { status: 503, headers });
let activeRequests = 0;

function provider() {
  return process.env.MAP_VISION_PROVIDER || (process.env.NODE_ENV === "development" ? "codex" : "openai");
}
function isLocal(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host")?.split(":")[0];
  return ["localhost", "127.0.0.1"].includes(url.hostname) && !!host && ["localhost", "127.0.0.1"].includes(host);
}
async function available() {
  return provider() === "codex" ? codexAvailable() : provider() === "openai" && !!process.env.OPENAI_API_KEY;
}
export async function GET(request: Request) {
  if (provider() === "codex" && !isLocal(request)) return unavailable();
  return await available() ? Response.json({ available: true, provider: provider() }, { headers }) : unavailable();
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "허용되지 않은 요청이에요." }, { status: 403, headers });
  if (provider() === "codex" && !isLocal(request)) return Response.json({ error: "로컬 지도 분석은 localhost에서 사용할 수 있어요." }, { status: 403, headers });
  if (!(await available())) return unavailable();
  if (activeRequests >= 2) return Response.json({ error: "지도 분석이 진행 중이에요. 잠시 후 다시 시도해주세요." }, { status: 429, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "지도 이미지 형식을 확인해주세요." }, { status: 415, headers });
  activeRequests++;
  try {
    let image: unknown;
    try {
      const data = JSON.parse(new TextDecoder().decode(await readLimitedBody(request.body, 6_000_000)));
      image = data.image;
      if (typeof image !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error("BAD_IMAGE");
      const bytes = Buffer.from(image.slice(image.indexOf(",") + 1), "base64");
      if (bytes.length < 33 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.readUInt32BE(4) !== 0x0d0a1a0a || bytes.readUInt32BE(16) !== 1024 || bytes.readUInt32BE(20) !== 1024) throw new Error("BAD_DIMENSIONS");
    } catch (error) {
      return Response.json({ error: "1024×1024 지도 PNG 이미지를 보내주세요." }, { status: error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400, headers });
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(provider() === "codex" ? CODEX_TIMEOUT_MS : 110000)]);
    const segmentation = provider() === "codex"
      ? await analyzeMapWithCodex(image as string, signal)
      : await analyzeMapImage(image as string, process.env.OPENAI_API_KEY!, process.env.OPENAI_MAP_VISION_MODEL || "gpt-4.1", signal);
    return Response.json({ segmentation, provider: provider() }, { headers });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ code: error instanceof ImageRouteError ? error.code : "VISION_FAILED", error: error instanceof ImageRouteError ? error.message : timeout ? "지도 분석 시간이 초과됐어요. 다시 시도해주세요." : "지도 이미지를 분석하지 못했어요. 다시 시도해주세요." }, { status: timeout ? 504 : 502, headers });
  } finally { activeRequests--; }
}
