/** Image coordinates use a 1000 × 1000 space, independent of display/DPR. */
export interface ImagePoint { x: number; y: number }
export interface GeoPoint { lat: number; lng: number }
export const ROAD_KINDS = ["footpath", "local_road", "crosswalk", "steps", "motorway", "unknown"] as const;
export const FEATURE_KINDS = ["greenery", "mountain", "water", "building", "icon"] as const;
export const FEATURE_CATEGORIES = ["park", "forest", "mountain", "water", "cafe", "shop", "culture", "viewpoint", "residential", "building", "transit", "other"] as const;
export interface ImageRoad {
  id: string;
  from: string;
  to: string;
  kind: typeof ROAD_KINDS[number];
  confidence: number;
  points: ImagePoint[];
}
export interface ImageFeature {
  id: string;
  kind: typeof FEATURE_KINDS[number];
  category: typeof FEATURE_CATEGORIES[number];
  label: string;
  point: ImagePoint;
  outline: ImagePoint[];
  confidence: number;
  /** A visibly adjacent road node, never an inferred line across a building. */
  accessNodeId: string | null;
}
export interface MapSegmentation {
  version: 1;
  nodes: (ImagePoint & { id: string })[];
  roads: ImageRoad[];
  features: ImageFeature[];
}
export interface MapSnapshot {
  image: string;
  origin: GeoPoint;
  originPixel: ImagePoint;
  capturedAt: string;
  level: number;
  /** Frozen SDK projection, still valid after the map moves or is destroyed. */
  toLatLng: (point: ImagePoint) => GeoPoint;
}

const pointSchema = {
  type: "object", additionalProperties: false, required: ["x", "y"],
  properties: { x: { type: "number", minimum: 0, maximum: 1000 }, y: { type: "number", minimum: 0, maximum: 1000 } },
};
const stringSchema = { type: "string" };
const confidenceSchema = { type: "number", minimum: 0, maximum: 1 };
export const SEGMENTATION_SCHEMA = {
  type: "object", additionalProperties: false, required: ["version", "nodes", "roads", "features"],
  properties: {
    version: { type: "integer", enum: [1] },
    nodes: { type: "array", maxItems: 300, items: {
      ...pointSchema, required: ["id", "x", "y"], properties: { ...pointSchema.properties, id: stringSchema },
    } },
    roads: { type: "array", maxItems: 400, items: {
      type: "object", additionalProperties: false, required: ["id", "from", "to", "kind", "confidence", "points"],
      properties: { id: stringSchema, from: stringSchema, to: stringSchema,
        kind: { type: "string", enum: ROAD_KINDS }, confidence: confidenceSchema,
        points: { type: "array", minItems: 2, maxItems: 100, items: pointSchema } },
    } },
    features: { type: "array", maxItems: 150, items: {
      type: "object", additionalProperties: false,
      required: ["id", "kind", "category", "label", "point", "outline", "confidence", "accessNodeId"],
      properties: { id: stringSchema, kind: { type: "string", enum: FEATURE_KINDS },
        category: { type: "string", enum: FEATURE_CATEGORIES }, label: stringSchema,
        point: pointSchema, outline: { type: "array", maxItems: 100, items: pointSchema },
        confidence: confidenceSchema, accessNodeId: { type: ["string", "null"] } },
    } },
  },
};

export class ImageRouteError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "ImageRouteError"; }
}

/** Validate even structured model output: valid JSON is not valid geometry. */
export function parseSegmentation(input: unknown): MapSegmentation {
  const invalid = () => { throw new ImageRouteError("INVALID_SEGMENTATION", "지도 분석 결과가 불완전해요. 다시 시도해주세요."); };
  const record = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return invalid();
    return v as Record<string, unknown>;
  };
  const list = (v: unknown, max: number): unknown[] => { if (!Array.isArray(v) || v.length > max) return invalid(); return v; };
  const str = (v: unknown, max = 100): string => { if (typeof v !== "string" || !v.trim() || v.length > max) return invalid(); return v; };
  const number = (v: unknown, max: number): number => { if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) return invalid(); return v; };
  const point = (v: unknown): ImagePoint => { const p = record(v); return { x: number(p.x, 1000), y: number(p.y, 1000) }; };
  const choice = <T extends string>(v: unknown, choices: readonly T[]): T => { if (!choices.includes(v as T)) return invalid(); return v as T; };
  const data = record(input);
  if (data.version !== 1) return invalid();
  const ids = new Set<string>();
  const unique = (v: unknown) => { const id = str(v); if (ids.has(id)) return invalid(); ids.add(id); return id; };
  const nodes = list(data.nodes, 300).map(v => { const n = record(v); return { id: unique(n.id), ...point(n) }; });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const roads = list(data.roads, 400).map(v => {
    const r = record(v), from = str(r.from), to = str(r.to);
    const points = list(r.points, 100).map(point);
    const a = nodeMap.get(from), b = nodeMap.get(to);
    if (!a || !b || from === to || points.length < 2 || Math.hypot(a.x - points[0].x, a.y - points[0].y) > 1 || Math.hypot(b.x - points[points.length - 1].x, b.y - points[points.length - 1].y) > 1) return invalid();
    // Normalize subpixel endpoint differences; do not invent junctions at crossings.
    points[0] = { x: a.x, y: a.y }; points[points.length - 1] = { x: b.x, y: b.y };
    return { id: unique(r.id), from, to, kind: choice(r.kind, ROAD_KINDS), confidence: number(r.confidence, 1), points };
  });
  const features = list(data.features, 150).map(v => {
    const f = record(v), kind = choice(f.kind, FEATURE_KINDS);
    const outline = list(f.outline, 100).map(point);
    if (kind !== "icon" && outline.length < 3) return invalid();
    const accessNodeId = f.accessNodeId === null ? null : str(f.accessNodeId);
    if (accessNodeId !== null && !nodeMap.has(accessNodeId)) return invalid();
    return { id: unique(f.id), kind, category: choice(f.category, FEATURE_CATEGORIES), label: str(f.label, 160), point: point(f.point), outline, confidence: number(f.confidence, 1), accessNodeId };
  });
  return { version: 1, nodes, roads, features };
}
