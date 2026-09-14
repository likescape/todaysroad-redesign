import type { Course } from "./courses";

/** Development-only synthetic route; the separate catalog's places have real evidence.
 * Does not claim these straight segments are walkable roads or entrances.
 */
export const SPOT_PREVIEW_COURSE: Course = {
  id: "dev-spot-route", markerName: "광흥창 이야기 산책", markerMeta: "검토용 가상 경로",
  title: "광흥창 이야기 산책", distance: "1.0km", duration: "15분", difficulty: "쉬움",
  description: "개발 미리보기 · 검토용 가상 경로예요. 실제 보행로를 확인한 코스는 아니에요.",
  lat: 37.54845, lng: 126.9287,
  path: [
    { lat: 37.54845, lng: 126.9287 }, { lat: 37.54845, lng: 126.9329 },
    { lat: 37.54735, lng: 126.9334 }, { lat: 37.54735, lng: 126.929 },
    { lat: 37.54845, lng: 126.9287 },
  ],
};
