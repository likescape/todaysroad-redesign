"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CURRENT_LOCATION, MAP_CENTER, type Course } from "@/lib/courses";

export interface KakaoMapHandle {
  moveToCurrentLocation: () => void;
  /** 초기 중심·줌으로 복귀 ('오늘의길' 버튼) */
  resetView: () => void;
}

interface KakaoMapProps {
  courses: Course[];
  selectedCourseId: string | null;
  onSelectCourse: (course: Course | null) => void;
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

function loadKakaoSdk(): Promise<any> {
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
  { courses, selectedCourseId, onSelectCourse },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const currentPosRef = useRef(CURRENT_LOCATION);
  const currentOverlayRef = useRef<any>(null);
  const courseElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [failed, setFailed] = useState(false);

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
          zIndex: 2,
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

        // 시안의 검은 코스 라인 (광흥창역을 지나는 산책 경로)
        const linePath = [
          [37.5468, 126.924],
          [37.5475, 126.9319],
          [37.5465, 126.937],
          [37.5476, 126.943],
        ].map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
        const courseLine = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 4,
          strokeColor: "#0f0f0f",
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });
        courseLine.setMap(map);
        overlays.push(courseLine);

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
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      overlays.forEach((o) => o.setMap(null));
      courseElsRef.current.clear();
      mapRef.current = null;
    };
  }, [courses]);

  // 선택된 코스 마커 강조
  useEffect(() => {
    courseElsRef.current.forEach((el, id) => {
      el.classList.toggle("is-selected", id === selectedCourseId);
    });
  }, [selectedCourseId]);

  useImperativeHandle(ref, () => ({
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
