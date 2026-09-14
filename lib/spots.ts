import type { Course } from "./courses";

export type SpotPoint = { lat: number; lng: number };
export type SpotEvidence = {
  publisher: string;
  url: string;
  sourceFile: string;
  sourceId: string;
  checkedOn: string;
  asOf: string;
  limitations: string[];
};
export type SpotPlace = {
  id: string;
  name: string;
  address: string | null;
  point: SpotPoint | null;
  geometry: "point" | "area" | "segment";
  location: {
    status: "verified" | "unverified";
    method: string;
    evidence: SpotEvidence[];
    limitations: string[];
  };
};
export type SpotStory = {
  id: string;
  placeId: string;
  title: string;
  summary: string;
  detail: string;
  observation?: string;
  category: "building" | "change" | "history" | "culture";
  claimKind: "fact" | "folklore" | "statistic" | "event";
  review: "approved" | "held";
  /** Editorial identity: nearby retellings of the same story compete for one slot. */
  storyKey: string;
  evidence: SpotEvidence[];
  event?: { startsOn: string; endsOn: string };
};
export type SpotCatalog = { places: SpotPlace[]; stories: SpotStory[] };
export type CourseSpot = {
  spotId: string;
  distanceMeters: number;
  progressMeters: number;
  order: number;
};
export type ResolvedSpot = { story: SpotStory; place: SpotPlace; link: CourseSpot };

/** Product-review assumptions, not walking distance or an accessibility guarantee. */
export const SPOT_CONFIG = { radiusMeters: 100, maxCount: 3, duplicateRadiusMeters: 80, eventLeadDays: 30 };
const METERS_PER_DEGREE = 111_195;
const DAY_MS = 86_400_000;
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const validPoint = (p: SpotPoint) => Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180;
const pointDistance = (a: SpotPoint, b: SpotPoint) => METERS_PER_DEGREE * Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180));

/** Local equirectangular projection in metres, suitable for this neighbourhood mockup.
 * Project onto EVERY segment (clamped to its endpoints); ties use the earlier passage.
 * The result is straight-line proximity to the drawn route, never a walkable connection.
 */
export function nearestRoutePosition(point: SpotPoint, path: SpotPoint[]) {
  if (!validPoint(point) || path.length < 2 || !path.every(validPoint)) return null;
  const longitudeScale = Math.cos(path[0].lat * Math.PI / 180);
  const xy = (p: SpotPoint) => ({ x: (p.lng - path[0].lng) * METERS_PER_DEGREE * longitudeScale, y: (p.lat - path[0].lat) * METERS_PER_DEGREE });
  const p = xy(point);
  let traversed = 0;
  let nearest = { distanceMeters: Infinity, progressMeters: 0 };
  for (let i = 1; i < path.length; i++) {
    const a = xy(path[i - 1]), b = xy(path[i]);
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length))) : 0;
    const distanceMeters = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
    if (distanceMeters < nearest.distanceMeters - 1e-7) nearest = { distanceMeters, progressMeters: traversed + t * length };
    traversed += length;
  }
  return traversed > 0 ? nearest : null;
}

/** Exact calendar dates: callers choose the timezone before injecting YYYY-MM-DD. */
function calendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
}

export function seoulDate(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function selectCourseSpots(path: SpotPoint[], catalog: SpotCatalog, asOf: string, config: Partial<typeof SPOT_CONFIG> = {}): CourseSpot[] {
  const settings = { ...SPOT_CONFIG, ...config };
  const today = calendarDay(asOf);
  if (!Number.isFinite(today) || !Object.values(settings).every(value => Number.isFinite(value) && value >= 0)) return [];
  const places = new Map(catalog.places.map(place => [place.id, place]));
  const candidates: ResolvedSpot[] = [];
  for (const story of catalog.stories) {
    const place = places.get(story.placeId);
    if (story.review !== "approved" || !story.evidence.length || !place?.point || place.geometry !== "point" || place.location.status !== "verified" || !place.location.evidence.length) continue;
    if (story.claimKind === "event") {
      const start = calendarDay(story.event?.startsOn ?? ""), end = calendarDay(story.event?.endsOn ?? "");
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || today > end || start - today > settings.eventLeadDays * DAY_MS) continue;
    }
    const nearest = nearestRoutePosition(place.point, path);
    if (!nearest || nearest.distanceMeters > settings.radiusMeters) continue;
    candidates.push({ story, place, link: { spotId: story.id, ...nearest, order: 0 } });
  }
  const rank = (a: ResolvedSpot, b: ResolvedSpot) => a.link.distanceMeters - b.link.distanceMeters || a.link.progressMeters - b.link.progressMeters || compareId(a.story.id, b.story.id);
  candidates.sort(rank);
  const selected: ResolvedSpot[] = [];
  while (candidates.length && selected.length < Math.min(SPOT_CONFIG.maxCount, Math.floor(settings.maxCount))) {
    const categories = new Set(selected.map(item => item.story.category));
    // Prefer an unused subject, then proximity, passage position, and stable ID.
    candidates.sort((a, b) => Number(categories.has(a.story.category)) - Number(categories.has(b.story.category)) || rank(a, b));
    const next = candidates.shift()!;
    if (selected.some(item => item.story.id === next.story.id || item.place.id === next.place.id || (item.story.storyKey === next.story.storyKey &&
      pointDistance(item.place.point!, next.place.point!) <= settings.duplicateRadiusMeters))) continue;
    selected.push(next);
  }
  return selected.sort((a, b) => a.link.progressMeters - b.link.progressMeters || compareId(a.story.id, b.story.id))
    .map((item, index) => ({ ...item.link, order: index + 1 }));
}

/** Called only once the route is prepared; startWalk retains this same Course. */
export function attachCourseSpots(course: Course, catalog: SpotCatalog, asOf: string): Course {
  return { ...course, spots: selectCourseSpots(course.path ?? [], catalog, asOf) };
}

export function resolveCourseSpots(course: Course | null, catalog: SpotCatalog): ResolvedSpot[] {
  return (course?.spots ?? []).flatMap(link => {
    const story = catalog.stories.find(item => item.id === link.spotId);
    const place = catalog.places.find(item => item.id === story?.placeId);
    return story && place ? [{ story, place, link }] : [];
  });
}
