import type { Course } from "./courses";

type Point = { lat: number; lng: number };

/** UI preview only: this path and the walking pace are simulated. */
export const PREVIEW_COURSE: Course = {
  id: "walk-preview", markerName: "조용한 산책", markerMeta: "2.0km · 30분",
  title: "조용한 산책", distance: "2.0km", duration: "30분", difficulty: "쉬움",
  description: "산책 흐름을 체험하는 고정 예시예요. 거리·시간·이동은 미리보기 값이며, 현재 위치나 선택한 조건은 반영하지 않아요.",
  lat: 37.5502, lng: 126.9304,
  path: [
    { lat: 37.5502, lng: 126.9304 }, { lat: 37.5513, lng: 126.9301 },
    { lat: 37.5521, lng: 126.9293 }, { lat: 37.5531, lng: 126.9290 },
    { lat: 37.5540, lng: 126.9297 }, { lat: 37.5548, lng: 126.9300 },
    { lat: 37.5555, lng: 126.9304 }, { lat: 37.5559, lng: 126.9316 },
    { lat: 37.5560, lng: 126.9330 }, { lat: 37.5558, lng: 126.9342 },
    { lat: 37.5551, lng: 126.9350 }, { lat: 37.5541, lng: 126.9355 },
    { lat: 37.5531, lng: 126.9356 }, { lat: 37.5521, lng: 126.9348 },
    { lat: 37.5510, lng: 126.9335 }, { lat: 37.5504, lng: 126.9321 },
    { lat: 37.5502, lng: 126.9304 },
  ],
};

export function formatWalkTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const parts = [minutes, seconds % 60].map((part) => String(part).padStart(2, "0"));
  return hours ? `${hours}:${parts.join(":")}` : parts.join(":");
}

/** Split by approximate geographic distance so the marker travels at a steady pace. */
export function splitWalkPath(path: Point[], progress: number) {
  if (path.length < 2) return { completed: path, position: path[0] };
  const lengths = path.slice(1).map((point, index) => {
    const previous = path[index];
    const longitudeScale = Math.cos(previous.lat * Math.PI / 180);
    return Math.hypot(point.lat - previous.lat, (point.lng - previous.lng) * longitudeScale);
  });
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, progress));
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const fraction = lengths[index] ? remaining / lengths[index] : 0;
      const start = path[index];
      const end = path[index + 1];
      const position = { lat: start.lat + (end.lat - start.lat) * fraction, lng: start.lng + (end.lng - start.lng) * fraction };
      return { completed: [...path.slice(0, index + 1), position], position };
    }
    remaining -= lengths[index];
  }
  return { completed: path, position: path[path.length - 1] };
}
