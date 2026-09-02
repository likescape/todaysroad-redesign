import type { Course } from "./courses";
import type { RecommendPrefs } from "./types";

export interface MoodTag {
  id: string;
  emoji: string;
  label: string;
}

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

export interface LatLng {
  lat: number;
  lng: number;
}

/** 산책 속도 (km/h) — 희망 시간을 거리로 환산할 때 사용 */
const WALK_KMH = 4;
const KM_PER_LAT = 111;

/**
 * 현재 위치에서 출발해 다시 돌아오는 순환 산책 경로를 만든다.
 * 희망 시간 → 거리 → 둘레가 그 거리인 타원을 잡고, 저주파 노이즈로
 * 골목을 도는 것처럼 울퉁불퉁하게 변형한다. 태그에 따라 진행 방향이 달라진다
 * (강변 → 남쪽 한강 방향, 언덕 → 북쪽).
 */
export function generateRoute(origin: LatLng, prefs: RecommendPrefs): LatLng[] {
  const km = (prefs.minutes / 60) * WALK_KMH;
  const radiusKm = km / (2 * Math.PI);
  const kmPerLng = KM_PER_LAT * Math.cos((origin.lat * Math.PI) / 180);

  let heading = Math.random() * Math.PI * 2;
  if (prefs.tags.includes("river")) heading = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  else if (prefs.tags.includes("hill")) heading = Math.PI / 2 + (Math.random() - 0.5) * 0.8;

  // 원점이 루프 위에 오도록 중심을 heading 방향으로 radius만큼 옮긴다
  const center = {
    lat: origin.lat + (Math.sin(heading) * radiusKm) / KM_PER_LAT,
    lng: origin.lng + (Math.cos(heading) * radiusKm) / kmPerLng,
  };
  const startAngle = heading + Math.PI; // 중심에서 본 원점의 각도
  const squash = 0.72 + Math.random() * 0.2;
  const p1 = Math.random() * Math.PI * 2;
  const p2 = Math.random() * Math.PI * 2;
  const dir = Math.random() < 0.5 ? 1 : -1;

  const N = 56;
  const pts: LatLng[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = startAngle + dir * t * Math.PI * 2;
    // 원점(t=0,1)에서는 노이즈를 0으로 눌러 정확히 출발점으로 돌아오게
    const edge = Math.sin(t * Math.PI);
    const wobble =
      1 + edge * (0.16 * Math.sin(3 * a + p1) + 0.09 * Math.sin(5 * a + p2));
    const rx = radiusKm * wobble;
    const ry = radiusKm * squash * wobble;
    const dx = Math.cos(a) * rx - Math.cos(startAngle) * radiusKm;
    const dy = Math.sin(a) * ry - Math.sin(startAngle) * radiusKm * squash;
    pts.push({
      lat: origin.lat + dy / KM_PER_LAT,
      lng: origin.lng + dx / kmPerLng,
    });
  }
  return pts;
}

/** 추천 조건으로 코스 카드(제목·거리·난이도·설명)를 만든다 */
export function generateCourse(origin: LatLng, prefs: RecommendPrefs): Course {
  const labels = prefs.tags
    .map((id) => MOOD_TAGS.find((t) => t.id === id)?.label)
    .filter((l): l is string => Boolean(l));
  const km = (prefs.minutes / 60) * WALK_KMH;
  const difficulty = prefs.tags.includes("hill")
    ? "어려움"
    : prefs.minutes >= 120
      ? "보통"
      : "쉬움";
  const path = generateRoute(origin, prefs);
  const title = `${labels.slice(0, 2).join(" ")} 산책`;

  return {
    id: `generated-${Date.now()}`,
    markerName: title,
    markerMeta: `${km.toFixed(1)}km · ${prefs.minutes}분`,
    title,
    distance: `${km.toFixed(1)}km`,
    duration: `${prefs.minutes}분`,
    difficulty,
    description: `${labels.join(", ")} 분위기로 ${prefs.minutes}분 동안 걷는 ${km.toFixed(1)}km 순환 코스예요. 현재 위치에서 출발해 다시 돌아와요.`,
    lat: origin.lat,
    lng: origin.lng,
    generated: true,
    path,
  };
}
