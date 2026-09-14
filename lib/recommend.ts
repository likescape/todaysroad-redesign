import type { Course } from "./courses";
import type { RecommendPrefs } from "./types";
import { ImageRouteError, parseSegmentation, type MapSnapshot } from "./map-segmentation";
import { planImageRoute, type ImageRoutePlan } from "./image-route-planner";

export interface MoodTag { id: string; emoji: string; label: string }
export const MOOD_TAGS: MoodTag[] = [
  { id: "nature", emoji: "🌿", label: "자연적인" },
  { id: "urban", emoji: "🏙️", label: "도시적인" },
  { id: "quiet", emoji: "🤫", label: "조용한" },
  { id: "lively", emoji: "🎉", label: "활기찬" },
  { id: "river", emoji: "🌊", label: "강변" },
  { id: "alley", emoji: "🏘️", label: "골목길" },
  { id: "night", emoji: "🌙", label: "야경" },
  { id: "cafe", emoji: "☕", label: "카페 투어" },
  { id: "hill", emoji: "⛰️", label: "언덕" },
  { id: "flat", emoji: "🚶", label: "평지" },
];
export interface LatLng { lat: number; lng: number }
export const GENERATION_STEPS = [
  "현재 위치의 지도 담기", "길·자연·건물·아이콘 구분", "산책 전략 구성", "카테고리 필터링", "경유지 선택", "길을 따라 연결", "코스 완성",
];
export type GenerationStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const label = (id: string) => MOOD_TAGS.find(tag => tag.id === id)?.label ?? id;

/** Card values come from the connected image route, not from the requested duration. */
export function courseFromImagePlan(snapshot: MapSnapshot, prefs: RecommendPrefs, plan: ImageRoutePlan): Course {
  const tags = prefs.tags.filter(id => !plan.unmatchedTags.includes(id));
  const title = `${tags.slice(0, 2).map(label).join(" ") || "주변 길"} 산책`;
  const distance = `${(plan.distanceMeters / 1000).toFixed(2)}km`, duration = `${plan.durationMinutes}분`;
  const notes = ["지도 이미지로 만든 코스예요. 실제 보행 가능 여부와 출입구는 현장에서 확인해주세요."];
  if (Math.abs(plan.durationMinutes - prefs.minutes) > Math.max(3, prefs.minutes * 0.2)) notes.push(`희망 ${prefs.minutes}분과 달리, 이미지에서 연결한 길은 약 ${plan.durationMinutes}분이에요.`);
  if (plan.unmatchedTags.length) notes.push(`${plan.unmatchedTags.map(label).join(", ")} 조건은 연결 가능한 경유지를 찾지 못해 반영하지 못했어요.`);
  if (prefs.tags.some(tag => ["quiet", "lively", "night", "flat"].includes(tag))) notes.push("조용함·활기·야경·평지는 지도에 보이는 장소 유형을 참고한 선호이며, 소음·조명·경사 확인 결과는 아니에요.");
  if (plan.startOffsetMeters > 5) notes.push(`현재 위치에서 약 ${Math.round(plan.startOffsetMeters)}m 떨어진 길에서 출발해요. 출발점까지의 이동은 코스에 포함하지 않았어요.`);
  return {
    id: `image-${Date.now()}`, markerName: title, markerMeta: `${distance} · ${duration}`, title, distance, duration,
    difficulty: plan.hasSteps ? "계단 포함" : "경사 미확인",
    description: `${plan.waypoints.map(w => w.label).join(" → ")} 주변 길을 지나 출발점으로 돌아와요.${plan.retraces ? " 일부 구간은 같은 길로 되돌아와요." : ""}`,
    lat: plan.path[0].lat, lng: plan.path[0].lng, generated: true, path: plan.path,
    imageAnalysis: { snapshot: snapshot.image, capturedAt: snapshot.capturedAt, level: snapshot.level, pixels: plan.pixels, waypoints: plan.waypoints, notes },
  };
}

export async function generateImageCourse(
  capture: (minutes: number, signal: AbortSignal) => Promise<MapSnapshot>,
  prefs: RecommendPrefs,
  onProgress: (step: GenerationStep) => void,
  signal: AbortSignal,
): Promise<Course> {
  if (![15, 30, 60, 90].includes(prefs.minutes) || !prefs.tags.length || prefs.tags.some(id => !MOOD_TAGS.some(tag => tag.id === id))) throw new ImageRouteError("INVALID_PREFS", "산책 시간과 카테고리를 다시 골라주세요.");
  const readResponse = async (response: Response) => {
    let body;
    try { body = await response.json(); } catch { throw new ImageRouteError("SERVICE_UNAVAILABLE", "지도 분석 서비스 응답을 받지 못했어요. 다시 시도해주세요."); }
    if (!response.ok) throw new ImageRouteError(body.code ?? "VISION_FAILED", typeof body.error === "string" ? body.error : "지도 이미지를 분석하지 못했어요.");
    return body;
  };
  // Check configuration before requesting GPS or capturing/sending an image.
  onProgress(1);
  await readResponse(await fetch("/api/map-segmentation", { signal, cache: "no-store" }));
  const snapshot = await capture(prefs.minutes, signal);
  signal.throwIfAborted(); onProgress(2);
  const response = await readResponse(await fetch("/api/map-segmentation", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: snapshot.image }), signal,
  }));
  signal.throwIfAborted();
  const segmentation = parseSegmentation(response.segmentation);
  const plan = planImageRoute(segmentation, snapshot, prefs, onProgress);
  signal.throwIfAborted(); onProgress(7);
  const course = courseFromImagePlan(snapshot, prefs, plan);
  course.imageAnalysis!.segmentation = segmentation;
  return course;
}
