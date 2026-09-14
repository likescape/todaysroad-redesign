import { ImageRouteError, type GeoPoint, type MapSnapshot } from "./map-segmentation";
import { mapTileUrl } from "./map-tile";

const SIZE = 1024;
/** Creates an isolated basemap at the user's origin, without app pins, paths or dark CSS. */
export async function captureMapSnapshot(kakao: any, origin: GeoPoint, minutes: number, signal: AbortSignal): Promise<MapSnapshot> {
  signal.throwIfAborted();
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "fixed", left: "-12000px", top: "0", width: `${SIZE}px`, height: `${SIZE}px`, pointerEvents: "none" });
  document.body.appendChild(host);
  // Keep streets and map icons legible; longer walks get a wider single snapshot.
  const level = minutes <= 15 ? 3 : minutes <= 30 ? 4 : 5;
  let snapshotMap: any;
  try {
    snapshotMap = new kakao.maps.Map(host, { center: new kakao.maps.LatLng(origin.lat, origin.lng), level, mapTypeId: kakao.maps.MapTypeId.ROADMAP, tileAnimation: false, draggable: false, scrollwheel: false });
    await new Promise<void>((resolve, reject) => {
      let stable = 0, settled = false;
      const finish = (error?: Error) => {
        if (settled) return; settled = true;
        clearInterval(poll); clearTimeout(timeout); signal.removeEventListener("abort", aborted);
        if (error) reject(error); else resolve();
      };
      const aborted = () => finish(new DOMException("Aborted", "AbortError"));
      const poll = setInterval(() => {
        const tiles = Array.from(host.querySelectorAll("img")).filter(img => mapTileUrl(img.src));
        const loaded = tiles.length > 0 && tiles.every(img => img.complete && img.naturalWidth > 0);
        stable = loaded ? stable + 1 : 0;
        if (stable >= 2) finish();
      }, 100);
      const timeout = setTimeout(() => finish(new ImageRouteError("SNAPSHOT_TIMEOUT", "주변 지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")), 12000);
      signal.addEventListener("abort", aborted, { once: true });
      if (signal.aborted) aborted();
    });
    signal.throwIfAborted();
    const projection = snapshotMap.getProjection();
    const corners = [[0, 0], [SIZE, 0], [0, SIZE]].map(([x, y]) => projection.coordsFromContainerPoint(new kakao.maps.Point(x, y)).toCoords());
    const basis = corners.map((p: any) => ({ x: p.getX(), y: p.getY() }));
    const Coords = kakao.maps.Coords;
    const originPoint = projection.containerPointFromCoords(new kakao.maps.LatLng(origin.lat, origin.lng));
    const rect = host.getBoundingClientRect();
    const tiles = Array.from(host.querySelectorAll("img")).flatMap(img => {
      const url = mapTileUrl(img.src), box = img.getBoundingClientRect();
      const x = box.left - rect.left, y = box.top - rect.top;
      return url && box.width > 0 && box.height > 0 && x < SIZE && y < SIZE && x + box.width > 0 && y + box.height > 0 ? [{ url, x, y, width: box.width, height: box.height }] : [];
    });
    const canvas = document.createElement("canvas"); canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx || !tiles.length || tiles.length > 36) throw new ImageRouteError("SNAPSHOT_EMPTY", "주변 지도 이미지를 캡처하지 못했어요.");
    // A separate coverage mask catches missing tiles instead of analyzing blank pixels.
    const coverage = new Uint8Array(SIZE * SIZE);
    await Promise.all(tiles.map(async tile => {
      const response = await fetch(`/api/map-tile?url=${encodeURIComponent(tile.url)}`, { signal });
      if (!response.ok) throw new ImageRouteError("SNAPSHOT_TILE", "지도 이미지를 가져오지 못했어요. 네트워크 연결을 확인하고 다시 시도해주세요.");
      const bitmap = await createImageBitmap(await response.blob());
      try { signal.throwIfAborted(); ctx.drawImage(bitmap, tile.x, tile.y, tile.width, tile.height); }
      finally { bitmap.close(); }
      for (let y = Math.max(0, Math.ceil(tile.y)); y < Math.min(SIZE, Math.floor(tile.y + tile.height)); y++) {
        coverage.fill(1, y * SIZE + Math.max(0, Math.ceil(tile.x)), y * SIZE + Math.min(SIZE, Math.floor(tile.x + tile.width)));
      }
    }));
    if (coverage.some(value => value === 0)) throw new ImageRouteError("SNAPSHOT_INCOMPLETE", "지도의 일부가 비어 있어요. 다시 시도해주세요.");
    // Preserve attribution on the composed basemap, outside the analyzed area (bottom strip).
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(0, SIZE - 22, SIZE, 22);
    ctx.fillStyle = "#333"; ctx.font = "12px sans-serif"; ctx.fillText("지도 © Kakao", 10, SIZE - 7);
    return {
      image: canvas.toDataURL("image/png"), origin, originPixel: { x: originPoint.x / SIZE * 1000, y: originPoint.y / SIZE * 1000 }, level, capturedAt: new Date().toISOString(),
      toLatLng({ x, y }) {
        const p = new Coords(basis[0].x + (basis[1].x - basis[0].x) * x / 1000 + (basis[2].x - basis[0].x) * y / 1000, basis[0].y + (basis[1].y - basis[0].y) * x / 1000 + (basis[2].y - basis[0].y) * y / 1000).toLatLng();
        return { lat: p.getLat(), lng: p.getLng() };
      },
    };
  } finally {
    // SDK has no destroy method. Remove DOM/listeners and release the isolated map.
    host.remove(); snapshotMap = null;
  }
}

export function locateForSnapshot(signal: AbortSignal): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new ImageRouteError("LOCATION_UNAVAILABLE", "현재 위치를 사용할 수 없어요. 위치를 지원하는 브라우저에서 다시 시도해주세요."));
    const aborted = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) { signal.removeEventListener("abort", aborted); return aborted(); }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      signal.removeEventListener("abort", aborted);
      if (signal.aborted) return;
      if (coords.accuracy > 150) return reject(new ImageRouteError("LOCATION_INACCURATE", "현재 위치의 오차가 커요. 위치 정확도를 높인 뒤 다시 시도해주세요."));
      resolve({ lat: coords.latitude, lng: coords.longitude });
    }, error => {
      signal.removeEventListener("abort", aborted);
      reject(new ImageRouteError("LOCATION_UNAVAILABLE", error.code === 1 ? "현재 위치로 코스를 만들려면 브라우저의 위치 권한을 허용해주세요." : "현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해주세요."));
    }, { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true });
  });
}
