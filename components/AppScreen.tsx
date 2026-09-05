"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { COURSES, type Course } from "@/lib/courses";
import type { MapStyle, Panel, RecommendPrefs } from "@/lib/types";
import { generateCourse } from "@/lib/recommend";
import KakaoMap, { type KakaoMapHandle } from "./KakaoMap";
import StatusBar from "./StatusBar";
import BrandButton from "./BrandButton";
import BottomNav, { type Tab } from "./BottomNav";
import IslandPanel from "./IslandPanel";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen";
import UiIcon from "./UiIcon";
import RecommendPanel from "./RecommendPanel";
import CourseSheet from "./CourseSheet";
import BottomControls from "./BottomControls";

/** 지도 위 경로 그리기 애니메이션 길이 */
const ROUTE_DRAW_MS = 1600;

export default function AppScreen() {
  const [tab, setTab] = useState<Tab>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [mapStyle] = useState<MapStyle>("light");
  // 지도에 그려진 생성 코스 경로와 '만드는 중' 연출 상태
  const [route, setRoute] = useState<Course["path"] | null>(null);
  const [generating, setGenerating] = useState(false);
  // 추천 패널이 수축된 뒤에 처리할 조건 (AnimatePresence onExitComplete에서 소비)
  const pendingPrefsRef = useRef<RecommendPrefs | null>(null);
  const generateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    },
    []
  );

  const handleSelectCourse = useCallback((course: Course | null) => {
    setSelectedCourse(course);
  }, []);

  const handleLocate = useCallback(() => {
    mapRef.current?.moveToCurrentLocation();
  }, []);

  const openPanel = useCallback((next: Exclude<Panel, null>) => {
    setSelectedCourse(null);
    setPanel(next);
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  // '오늘의길' 버튼: 어떤 상태에서든 처음 화면으로
  const goHome = useCallback(() => {
    setTab("home");
    setSettingsOpen(false);
    pendingPrefsRef.current = null;
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    setGenerating(false);
    setRoute(null);
    setPanel(null);
    setSelectedCourse(null);
    mapRef.current?.resetView();
  }, []);

  // 추천 조건을 보관하고 패널을 닫는다. 실제 생성은 패널이 버튼으로 줄어든 뒤 시작.
  const handleRecommendSubmit = useCallback((prefs: RecommendPrefs) => {
    pendingPrefsRef.current = prefs;
    setPanel(null);
  }, []);

  // 패널 수축 완료 → '만드는 중' 필 + 지도에 경로가 그려짐 → 코스 시트 등장
  const handlePanelExitComplete = useCallback(() => {
    const prefs = pendingPrefsRef.current;
    if (!prefs) return;
    pendingPrefsRef.current = null;

    const origin = mapRef.current?.getCurrentPosition() ?? {
      lat: COURSES[0].lat,
      lng: COURSES[0].lng,
    };
    const course = generateCourse(origin, prefs);
    setSelectedCourse(null);
    setGenerating(true);
    setRoute(course.path ?? null);
    generateTimerRef.current = setTimeout(() => {
      setGenerating(false);
      setSelectedCourse(course);
    }, ROUTE_DRAW_MS + 250);
  }, []);

  useEffect(() => {
    if (!panel && !settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanel(null); setSettingsOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, settingsOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app" data-map-style={mapStyle}>
        <KakaoMap
          ref={mapRef}
          courses={COURSES}
          selectedCourseId={selectedCourse?.id ?? null}
          onSelectCourse={handleSelectCourse}
          route={route}
          routeDrawMs={ROUTE_DRAW_MS}
        />
        {tab === "my" && <ProfileScreen onHome={goHome} onSettings={() => setSettingsOpen(true)} />}
        {tab === "community" && <section className="page-surface community-placeholder"><h1>커뮤니티</h1><p>함께 나눌 산책 이야기를 준비하고 있어요.</p></section>}
        <StatusBar />

        <AnimatePresence>
          {panel && (
            <motion.div
              key="scrim"
              className="island-scrim"
              onClick={closePanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>

        {!settingsOpen && tab !== "my" && <header className="top-bar">
          <BrandButton onClick={goHome} integrated={panel !== null} />
          {tab === "community" && <button className="icon-button" aria-label="홈으로 돌아가기" onClick={goHome}><UiIcon name="back" /></button>}
        </header>}

        <AnimatePresence onExitComplete={handlePanelExitComplete}>
          {panel === "recommend" && (
            <IslandPanel
              key="recommend"
              layoutId="island-recommend"
              anchor="top"
              fill
              title="코스 추천"
              onClose={closePanel}
            >
              <RecommendPanel onSubmit={handleRecommendSubmit} />
            </IslandPanel>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {generating && (
            <motion.div
              key="generating"
              className="generating-pill"
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                animate={{ rotate: [0, 20, -12, 0], scale: [1, 1.2, 0.95, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M12 2.5c.5 3.9 2 6.6 5.5 7.5-3.5.9-5 3.6-5.5 7.5-.5-3.9-2-6.6-5.5-7.5 3.5-.9 5-3.6 5.5-7.5z" />
                <path d="M19 13.5c.3 2.1 1.1 3.5 3 4-1.9.5-2.7 1.9-3 4-.3-2.1-1.1-3.5-3-4 1.9-.5 2.7-1.9 3-4z" />
              </motion.svg>
              오늘의 코스를 만들고 있어요
              <span className="generating-dots">
                {[0, 1, 2].map((i) => (
                  <motion.i
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedCourse && !panel && tab === "home" && !settingsOpen && (
            <CourseSheet
              key={selectedCourse.id}
              course={selectedCourse}
              onClose={() => setSelectedCourse(null)}
            />
          )}
        </AnimatePresence>

        {tab === "home" && !settingsOpen && <BottomControls
          panel={panel}
          onOpenRecommend={() => openPanel("recommend")}
          onLocate={handleLocate}
        />}
        {!settingsOpen && <BottomNav tab={tab} onChange={(next) => { goHome(); setTab(next); }} />}
        {settingsOpen && <SettingsScreen onBack={() => setSettingsOpen(false)} />}
      </div>
    </MotionConfig>
  );
}
