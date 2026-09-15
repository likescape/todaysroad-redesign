"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CURRENT_LOCATION, MAP_CENTER, type Course } from "@/lib/courses";
import { splitWalkPath } from "@/lib/walk";
import { useTheme } from "./ThemeProvider";
import type { ImageWaypoint } from "@/lib/image-route-planner";

export interface KakaoMapHandle {
  moveToCurrentLocation: () => void;
  /** 초기 중심·줌으로 복귀 ('오늘의길' 버튼) */
  resetView: () => void;
  /** 현재 위치 마커가 놓인 좌표 */
  getCurrentPosition: () => { lat: number; lng: number };
}

interface KakaoMapProps {
  courses: Course[];
  selectedCourseId: string | null;
  onSelectCourse: (course: Course | null) => void;
  /** 생성된 산책 경로 — 바뀌면 지도 위에 선이 그려지는 애니메이션이 재생된다 */
  route?: { lat: number; lng: number }[] | null;
  /** 경로 그리기 애니메이션 길이(ms) */
  routeDrawMs?: number;
  /** Simulated progress for the walking UI preview; null means no active walk. */
  walkProgress?: number | null;
  waypoints?: ImageWaypoint[];
}

declare global {
  interface Window {
    kakao: any;
    __kakaoSdkPromise?: Promise<any>;
  }
}

const INITIAL_LEVEL = 4;

const KAKAO_APP_KEY =
  process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "c27a21ad128ccdc8bc1b3ec50662e18b";

export function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.__kakaoSdkPromise) return window.__kakaoSdkPromise;

  window.__kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error("Kakao Map SDK load failed"));
    document.head.appendChild(script);
  });
  return window.__kakaoSdkPromise;
}

function createCurrentLocationEl() {
  const el = document.createElement("div");
  el.className = "current-marker";
  el.innerHTML = `
    <span class="current-marker-pulse"></span>
    <span class="current-marker-dot">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3.5 18.5 19 12 15.6 5.5 19z"/>
      </svg>
    </span>`;
  return el;
}

function createCourseEl(course: Course, onClick: () => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "course-marker";
  el.setAttribute("aria-label", `추천 코스 ${course.markerName}`);
  el.innerHTML = `
    <span class="course-bubble">
      <span class="course-bubble-name"><i></i>${course.markerName}</span>
      <span class="course-bubble-meta">${course.markerMeta}</span>
    </span>
    <span class="course-bubble-tail"></span>
    <span class="course-anchor"><i></i></span>`;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  // 지도 드래그와의 충돌 방지: 마커 위에서 시작된 터치/드래그가 지도로 전파되지 않도록
  ["mousedown", "touchstart"].forEach((type) =>
    el.addEventListener(type, (e) => e.stopPropagation())
  );
  return el;
}

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  { courses, selectedCourseId, onSelectCourse, route = null, routeDrawMs = 1600, walkProgress = null, waypoints },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const mapRef = useRef<any>(null);
  const currentPosRef = useRef(CURRENT_LOCATION);
  const currentOverlayRef = useRef<any>(null);
  const courseElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const routeRef = useRef<{ halo: any; line: any; turn: any; completed: any } | null>(null);
  const walking = walkProgress !== null;
  const positionBeforeWalkRef = useRef(CURRENT_LOCATION);

  const onSelectRef = useRef(onSelectCourse);
  onSelectRef.current = onSelectCourse;

  useEffect(() => {
    let cancelled = false;
    const overlays: any[] = [];

    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng),
          level: INITIAL_LEVEL,
        });
        map.setDraggable(true);
        map.setZoomable(true);
        mapRef.current = map;

        // 현재 위치 마커
        const currentEl = createCurrentLocationEl();
        const currentOverlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(
            CURRENT_LOCATION.lat,
            CURRENT_LOCATION.lng
          ),
          content: currentEl,
          yAnchor: 0.5,
          zIndex: 4,
        });
        currentOverlay.setMap(map);
        currentOverlayRef.current = currentOverlay;
        overlays.push(currentOverlay);

        // 추천 코스 마커
        courses.forEach((course) => {
          const el = createCourseEl(course, () =>
            onSelectRef.current(course)
          );
          courseElsRef.current.set(course.id, el);
          const overlay = new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(course.lat, course.lng),
            content: el,
            yAnchor: 1,
            zIndex: 3,
          });
          overlay.setMap(map);
          overlays.push(overlay);
        });

        // 광흥창역 정차점 마커
        const stopEl = document.createElement("div");
        stopEl.className = "transit-stop";
        stopEl.innerHTML = `<i></i><span>광흥창역</span>`;
        const stopOverlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(37.5475, 126.9319),
          content: stopEl,
          yAnchor: 0.28,
          zIndex: 1,
        });
        stopOverlay.setMap(map);
        overlays.push(stopOverlay);

        // 지도 빈 곳 클릭 시 코스 시트 닫기
        kakao.maps.event.addListener(map, "click", () =>
          onSelectRef.current(null)
        );

        // 뷰포트 변화(목업 ↔ 모바일 전환 포함) 시 지도 타일 재배치
        const resizeObserver = new ResizeObserver(() => {
          const center = map.getCenter();
          map.relayout();
          map.setCenter(center);
        });
        resizeObserver.observe(containerRef.current);
        overlays.push({ setMap: () => resizeObserver.disconnect() });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      overlays.forEach((o) => o.setMap(null));
      courseElsRef.current.clear();
      mapRef.current = null;
      setReady(false);
    };
  }, [courses]);

  useEffect(() => {
    if (!ready || !mapRef.current || !waypoints) return;
    const kakao = window.kakao;
    const overlays = waypoints.map((waypoint, index) => {
      const el = document.createElement("div");
      el.className = "image-waypoint-marker";
      el.textContent = String(index + 1);
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `경유지 ${index + 1}: ${waypoint.label} 주변 길`);
      el.title = `${waypoint.label} 주변 길`;
      const overlay = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(waypoint.point.lat, waypoint.point.lng), content: el, yAnchor: 0.5, zIndex: 4 });
      overlay.setMap(mapRef.current);
      return overlay;
    });
    return () => overlays.forEach(overlay => overlay.setMap(null));
  }, [waypoints, ready]);

  // 생성된 경로를 출발점부터 차례로 그려 나간다
  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!ready || !map || !kakao) return;

    routeRef.current?.halo.setMap(null);
    routeRef.current?.line.setMap(null);
    routeRef.current?.turn.setMap(null);
    routeRef.current?.completed.setMap(null);
    routeRef.current = null;
    if (!route || route.length < 2) return;

    const toLatLng = (p: { lat: number; lng: number }) =>
      new kakao.maps.LatLng(p.lat, p.lng);
    const halo = new kakao.maps.Polyline({
      path: [],
      strokeWeight: 10,
      strokeColor: "#ffffff",
      strokeOpacity: 0.95,
      strokeStyle: "solid",
      zIndex: 1,
    });
    const line = new kakao.maps.Polyline({
      path: [],
      strokeWeight: 4.5,
      strokeColor: walking ? "#a0a2a0" : "#0f0f0f",
      strokeOpacity: 0.95,
      strokeStyle: walking ? "dash" : "solid",
      zIndex: 2,
    });
    halo.setMap(map);
    line.setMap(map);
    const completed = new kakao.maps.Polyline({
      path: [], strokeWeight: 4.5, strokeColor: "#318737",
      strokeOpacity: 1, strokeStyle: "solid", zIndex: 3,
    });
    completed.setMap(map);

    // 반환점: 출발점에서 가장 먼 지점
    const origin = route[0];
    let far = route[0];
    let farD = 0;
    route.forEach((p) => {
      const d = (p.lat - origin.lat) ** 2 + (p.lng - origin.lng) ** 2;
      if (d > farD) {
        farD = d;
        far = p;
      }
    });
    const turnEl = document.createElement("div");
    turnEl.className = "route-turn";
    turnEl.innerHTML = `<i></i><span>반환점</span>`;
    const turn = new kakao.maps.CustomOverlay({
      position: toLatLng(far),
      content: turnEl,
      yAnchor: 0.5,
      zIndex: 2,
    });
    routeRef.current = { halo, line, turn, completed };

    // 경로 전체가 보이도록 맞춘 뒤, 하단 시트에 가리지 않게 살짝 위로 올린다
    const bounds = new kakao.maps.LatLngBounds();
    route.forEach((p) => bounds.extend(toLatLng(p)));
    const preview = document.querySelector<HTMLElement>("#todaysroad-app .course-preview");
    const bottomPadding = !walking && preview && containerRef.current
      ? Math.max(280, containerRef.current.clientHeight - preview.offsetTop - 40)
      : walking ? 285 : 460;
    map.setBounds(bounds, walking ? 140 : 165, 60, bottomPadding, 60);

    const dispose = () => {
      halo.setMap(null); line.setMap(null); turn.setMap(null); completed.setMap(null);
      routeRef.current = null;
    };
    if (walking) {
      const path = route.map(toLatLng);
      halo.setPath(path);
      line.setPath(path);
      turn.setMap(map);
      return dispose;
    }

    // 점 사이를 보간하며 선을 늘려 나간다
    const segs = route.length - 1;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / routeDrawMs);
      const pos = ease(t) * segs;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const path = route.slice(0, idx + 1).map(toLatLng);
      if (idx < segs) {
        const a = route[idx];
        const b = route[idx + 1];
        path.push(
          toLatLng({
            lat: a.lat + (b.lat - a.lat) * frac,
            lng: a.lng + (b.lng - a.lng) * frac,
          })
        );
      }
      halo.setPath(path);
      line.setPath(path);
      if (t < 1) raf = requestAnimationFrame(tick);
      else turn.setMap(map);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); dispose(); };
  }, [route, ready, routeDrawMs, walking]);

  // Recolor existing polylines without recreating the map, resetting the camera,
  // or replaying the route animation when the device appearance changes.
  useEffect(() => {
    const lines = routeRef.current;
    if (!ready || !lines) return;
    const styles = getComputedStyle(document.documentElement);
    lines.halo.setOptions({ strokeColor: styles.getPropertyValue("--route-halo").trim() });
    lines.line.setOptions({ strokeColor: styles.getPropertyValue(walking ? "--route-pending" : "--route-line").trim() });
    lines.completed.setOptions({ strokeColor: styles.getPropertyValue("--green").trim() });
  }, [theme, ready, route, walking, routeDrawMs]);

  useEffect(() => {
    if (!ready) return;
    if (walking) positionBeforeWalkRef.current = { ...currentPosRef.current };
    else {
      currentPosRef.current = positionBeforeWalkRef.current;
      const position = currentPosRef.current;
      currentOverlayRef.current?.setPosition(new window.kakao.maps.LatLng(position.lat, position.lng));
    }
  }, [walking, ready]);

  useEffect(() => {
    if (!ready || walkProgress === null || !route?.length) return;
    const { completed, position } = splitWalkPath(route, walkProgress);
    const toLatLng = (point: { lat: number; lng: number }) => new window.kakao.maps.LatLng(point.lat, point.lng);
    routeRef.current?.completed.setPath(completed.map(toLatLng));
    currentPosRef.current = position;
    currentOverlayRef.current?.setPosition(toLatLng(position));
  }, [walkProgress, route, ready]);

  // 선택된 코스 마커 강조
  useEffect(() => {
    courseElsRef.current.forEach((el, id) => {
      el.classList.toggle("is-selected", id === selectedCourseId);
    });
  }, [selectedCourseId, ready]);

  useImperativeHandle(ref, () => ({
    getCurrentPosition() {
      return { ...currentPosRef.current };
    },
    resetView() {
      const map = mapRef.current;
      const kakao = window.kakao;
      if (!map || !kakao) return;
      if (map.getLevel() !== INITIAL_LEVEL) map.setLevel(INITIAL_LEVEL, { animate: true });
      map.panTo(new kakao.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng));
    },
    moveToCurrentLocation() {
      const map = mapRef.current;
      const kakao = window.kakao;
      if (!map || !kakao) return;

      if (walking) {
        map.panTo(new kakao.maps.LatLng(currentPosRef.current.lat, currentPosRef.current.lng));
        return;
      }

      const panTo = (lat: number, lng: number) => {
        const pos = new kakao.maps.LatLng(lat, lng);
        currentPosRef.current = { lat, lng };
        currentOverlayRef.current?.setPosition(pos);
        map.panTo(pos);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => panTo(coords.latitude, coords.longitude),
          () => panTo(currentPosRef.current.lat, currentPosRef.current.lng),
          { timeout: 3000, maximumAge: 60_000 }
        );
      } else {
        panTo(currentPosRef.current.lat, currentPosRef.current.lng);
      }
    },
  }));

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-root" />
      {failed && (
        <div className="map-fallback">
          <p>
            지도를 불러오지 못했어요.
            <br />
            카카오 개발자 콘솔에 현재 도메인이
            <br />
            등록되어 있는지 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
});

export default KakaoMap;
