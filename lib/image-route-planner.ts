import { ImageRouteError, type GeoPoint, type ImageFeature, type ImagePoint, type ImageRoad, type MapSegmentation, type MapSnapshot } from "./map-segmentation";
import type { RecommendPrefs } from "./types";

const CATEGORY_TAGS: Record<ImageFeature["category"], string[]> = {
  park: ["nature", "quiet", "flat"], forest: ["nature", "quiet"], mountain: ["nature", "hill"],
  water: ["nature", "river", "flat"], cafe: ["cafe", "urban", "lively"], shop: ["urban", "lively"],
  culture: ["urban"], viewpoint: ["night"], residential: ["alley", "quiet"], building: ["urban"], transit: ["urban", "lively"], other: [],
};
export interface ImageWaypoint {
  featureId: string;
  label: string;
  category: ImageFeature["category"];
  tags: string[];
  point: GeoPoint;
  pixel: ImagePoint;
}
export interface ImageRoutePlan {
  path: GeoPoint[];
  pixels: ImagePoint[];
  waypoints: ImageWaypoint[];
  distanceMeters: number;
  durationMinutes: number;
  startOffsetMeters: number;
  unmatchedTags: string[];
  hasSteps: boolean;
  retraces: boolean;
  roadIds: string[];
}
/** Observable intermediate results from this run, including a run that cannot finish. */
export interface ImageRouteTrace {
  step: number;
  targetMeters: number;
  acceptedRoadIds: string[];
  excludedRoads: { id: string; reason: string }[];
  candidateFeatureIds: string[];
  nearestRoad?: { pixel: ImagePoint; offsetMeters: number };
}
export function createImageRouteTrace(): ImageRouteTrace {
  return { step: 2, targetMeters: 0, acceptedRoadIds: [], excludedRoads: [], candidateFeatureIds: [] };
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const radians = Math.PI / 180, dlat = (b.lat - a.lat) * radians, dlng = (b.lng - a.lng) * radians;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function pointInPolygon(p: ImagePoint, polygon: ImagePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function intersects(a: ImagePoint, b: ImagePoint, c: ImagePoint, d: ImagePoint): boolean {
  const cross = (p: ImagePoint, q: ImagePoint, r: ImagePoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const on = (p: ImagePoint, q: ImagePoint, r: ImagePoint) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) && r.x <= Math.max(p.x, q.x) && r.y >= Math.min(p.y, q.y) && r.y <= Math.max(p.y, q.y);
  return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}
/** Exact segment/polygon intersection: even thin barriers cannot be skipped by sampling. */
export function crossesObstacle(points: ImagePoint[], obstacles: ImageFeature[]): boolean {
  return obstacles.some(({ outline }) => points.some(p => pointInPolygon(p, outline)) || points.slice(1).some((b, index) => {
    const a = points[index];
    return outline.some((c, i) => intersects(a, b, c, outline[(i + 1) % outline.length]));
  }));
}

interface Edge { from: string; to: string; road: ImageRoad; pixels: ImagePoint[]; meters: number; cost: number }
interface Leg { edges: Edge[]; meters: number }
function shortestPaths(graph: Map<string, Edge[]>, start: string): Map<string, Leg> {
  const costs = new Map([[start, 0]]), previous = new Map<string, Edge>(), visited = new Set<string>();
  // At most 301 nodes. A simple bounded Dijkstra is easier to audit here than a grid search.
  while (true) {
    let current: string | undefined, cost = Infinity;
    for (const [id, value] of costs) if (!visited.has(id) && value < cost) { current = id; cost = value; }
    if (current === undefined) break;
    visited.add(current);
    for (const edge of graph.get(current) ?? []) {
      if (cost + edge.cost < (costs.get(edge.to) ?? Infinity)) { costs.set(edge.to, cost + edge.cost); previous.set(edge.to, edge); }
    }
  }
  const result = new Map<string, Leg>([[start, { edges: [], meters: 0 }]]);
  for (const node of visited) {
    if (node === start) continue;
    const edges: Edge[] = [];
    let current = node;
    while (current !== start) { const edge = previous.get(current)!; edges.push(edge); current = edge.from; }
    edges.reverse();
    result.set(node, { edges, meters: edges.reduce((n, e) => n + e.meters, 0) });
  }
  return result;
}

/** No POI lookup, directions API, region assumptions, random shapes, or off-road connectors. */
export function planImageRoute(segmentation: MapSegmentation, snapshot: MapSnapshot, prefs: RecommendPrefs, onProgress?: (step: 3 | 4 | 5 | 6) => void, trace?: ImageRouteTrace): ImageRoutePlan {
  onProgress?.(3);
  const target = prefs.minutes / 60 * 4000;
  const obstacles = segmentation.features.filter(f => f.kind === "water" || f.kind === "building");
  const length = (points: ImagePoint[]) => points.slice(1).reduce((total, p, i) => total + distanceMeters(snapshot.toLatLng(points[i]), snapshot.toLatLng(p)), 0);
  const accepted = segmentation.roads.filter(r => {
    const reason = r.confidence < 0.8 ? "인식 신뢰도 부족" : r.kind === "unknown" ? "길 유형 불명확" : r.kind === "motorway" ? "자동차 전용" : prefs.tags.includes("flat") && r.kind === "steps" ? "평지 선택·계단 제외" : crossesObstacle(r.points, obstacles) ? "건물·물 영역과 겹침" : null;
    if (reason) trace?.excludedRoads.push({ id: r.id, reason });
    return !reason;
  });
  if (trace) { trace.step = 3; trace.targetMeters = target; trace.acceptedRoadIds = accepted.map(r => r.id); }
  if (!accepted.length) throw new ImageRouteError("NO_ROADS", "이미지에서 연결 가능한 길을 찾지 못했어요. 더 선명한 지도로 다시 시도해주세요.");

  // Project the origin onto the closest recognized road segment, then split that edge.
  // The off-road gap is disclosed but is NEVER added as a straight route segment.
  let nearest: { road: ImageRoad; index: number; pixel: ImagePoint; meters: number } | undefined;
  for (const road of accepted) for (let i = 0; i < road.points.length - 1; i++) {
    const a = road.points[i], b = road.points[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((snapshot.originPixel.x - a.x) * dx + (snapshot.originPixel.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const pixel = { x: a.x + dx * t, y: a.y + dy * t }, meters = distanceMeters(snapshot.origin, snapshot.toLatLng(pixel));
    if (!nearest || meters < nearest.meters) nearest = { road, index: i, pixel, meters };
  }
  if (trace && nearest) trace.nearestRoad = { pixel: nearest.pixel, offsetMeters: nearest.meters };
  if (!nearest || nearest.meters > 60) throw new ImageRouteError("START_NOT_ON_ROAD", "현재 위치 가까이에서 출발할 길을 찾지 못했어요. 길 가까이 이동한 뒤 다시 시도해주세요.");
  const origin = nearest;
  let startId = "__image_route_start";
  while (segmentation.nodes.some(n => n.id === startId)) startId += "_";
  const graph = new Map<string, Edge[]>();
  const add = (from: string, to: string, pixels: ImagePoint[], road: ImageRoad) => {
    const meters = length(pixels);
    const preference = road.kind === "footpath" && prefs.tags.some(t => ["nature", "quiet", "river"].includes(t)) ? 0.9 : 1;
    const cost = Math.max(0.0001, meters) * preference;
    const put = (edge: Edge) => graph.set(edge.from, [...graph.get(edge.from) ?? [], edge]);
    put({ from, to, pixels, road, meters, cost }); put({ from: to, to: from, pixels: [...pixels].reverse(), road, meters, cost });
  };
  for (const road of accepted) {
    if (road.id === origin.road.id) {
      add(road.from, startId, [...road.points.slice(0, origin.index + 1), origin.pixel], road);
      add(startId, road.to, [origin.pixel, ...road.points.slice(origin.index + 1)], road);
    } else add(road.from, road.to, road.points, road);
  }
  const fromStart = shortestPaths(graph, startId);
  const nodes = new Map(segmentation.nodes.map(n => [n.id, n]));
  onProgress?.(4);
  if (trace) trace.step = 4;
  const eligible = segmentation.features.flatMap(feature => {
    const tags = prefs.tags.filter(tag => CATEGORY_TAGS[feature.category].includes(tag));
    const node = feature.accessNodeId ? nodes.get(feature.accessNodeId) : undefined;
    if (feature.confidence < 0.8 || !tags.length || !node || !fromStart.has(node.id)) return [];
    // Large parks/rivers use their visible boundary, not a centroid far from the road.
    const anchors = [feature.point, ...feature.outline];
    if (Math.min(...anchors.map(p => distanceMeters(snapshot.toLatLng(p), snapshot.toLatLng(node)))) > 100) return [];
    const leg = fromStart.get(node.id)!;
    if (leg.meters * 2 > target * 1.3) return [];
    return [{ feature, node, tags, distance: leg.meters }];
  }).sort((a, b) => b.tags.length - a.tags.length || Math.abs(a.distance * 2 - target) - Math.abs(b.distance * 2 - target) || a.feature.id.localeCompare(b.feature.id));
  if (trace) trace.candidateFeatureIds = eligible.map(c => c.feature.id);
  // Preserve a candidate for each requested category before filling the bounded search.
  onProgress?.(5);
  if (trace) trace.step = 5;
  const candidates: typeof eligible = [];
  const include = (candidate: typeof eligible[number]) => { if (!candidates.some(c => c.node.id === candidate.node.id)) candidates.push(candidate); };
  prefs.tags.forEach(tag => { const candidate = eligible.find(c => c.tags.includes(tag)); if (candidate) include(candidate); });
  eligible.forEach(candidate => { if (candidates.length < 10) include(candidate); });
  if (!candidates.length) throw new ImageRouteError("NO_WAYPOINTS", "선택한 카테고리의 장소와 이어지는 길을 찾지 못했어요. 다른 카테고리나 시간으로 다시 시도해주세요.");
  onProgress?.(6);
  if (trace) trace.step = 6;
  const paths = new Map([[startId, fromStart]]);
  candidates.forEach(c => paths.set(c.node.id, shortestPaths(graph, c.node.id)));
  type Option = { stops: typeof candidates; edges: Edge[]; meters: number; score: number; repeat: number };
  const options: Option[] = [];
  const visit = (stops: typeof candidates, last: string, edges: Edge[], meters: number) => {
    if (stops.length) {
      const home = paths.get(last)?.get(startId);
      if (!home) return;
      const all = [...edges, ...home.edges], total = meters + home.meters;
      if (total >= 100 && total <= target * 1.3) {
        const seen = new Set<string>();
        const repeat = all.reduce((sum, e) => { const id = [e.from, e.to].sort().join("\u0000"); const extra = seen.has(id) ? e.meters : 0; seen.add(id); return sum + extra; }, 0);
        const coverage = new Set(stops.flatMap(s => s.tags)).size;
        const score = coverage * 4 - Math.abs(total - target) / target * 3 - repeat / total;
        options.push({ stops, edges: all, meters: total, score, repeat });
      }
    }
    if (stops.length === 3) return;
    for (const candidate of candidates) {
      if (stops.includes(candidate)) continue;
      const leg = paths.get(last)?.get(candidate.node.id), home = paths.get(candidate.node.id)?.get(startId);
      if (!leg || !home || meters + leg.meters + home.meters > target * 1.3) continue;
      visit([...stops, candidate], candidate.node.id, [...edges, ...leg.edges], meters + leg.meters);
    }
  };
  visit([], startId, [], 0);
  options.sort((a, b) => b.score - a.score);
  const best = options[0];
  if (!best) throw new ImageRouteError("NO_CONNECTED_ROUTE", "경유지를 지나 돌아오는 길을 연결하지 못했어요. 다른 카테고리나 시간으로 다시 시도해주세요.");
  const pixels: ImagePoint[] = [];
  best.edges.forEach(edge => edge.pixels.forEach(p => { const previous = pixels[pixels.length - 1]; if (!previous || previous.x !== p.x || previous.y !== p.y) pixels.push(p); }));
  // Keep generated walks within the existing journal's coordinate limit.
  if (pixels.length > 10000) throw new ImageRouteError("ROUTE_TOO_COMPLEX", "연결한 경로가 너무 복잡해요. 더 짧은 시간으로 다시 시도해주세요.");
  const matched = new Set(best.stops.flatMap(s => s.tags));
  if (trace) trace.step = 7;
  return {
    path: pixels.map(snapshot.toLatLng), pixels,
    waypoints: best.stops.map(({ feature, node, tags }) => ({ featureId: feature.id, label: feature.label, category: feature.category, tags, point: snapshot.toLatLng(node), pixel: { x: node.x, y: node.y } })),
    distanceMeters: best.meters, durationMinutes: Math.max(1, Math.round(best.meters / 4000 * 60)),
    startOffsetMeters: origin.meters, unmatchedTags: prefs.tags.filter(t => !matched.has(t)),
    hasSteps: best.edges.some(e => e.road.kind === "steps"), retraces: best.repeat > best.meters * 0.2,
    roadIds: [...new Set(best.edges.map(e => e.road.id))],
  };
}
