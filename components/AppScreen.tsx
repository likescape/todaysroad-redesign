"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { COURSES, type Course } from "@/lib/courses";
import type { MapStyle, Panel, RecommendPrefs } from "@/lib/types";
import KakaoMap, { type KakaoMapHandle } from "./KakaoMap";
import StatusBar from "./StatusBar";
import BrandButton from "./BrandButton";
import TopActions from "./TopActions";
import IslandPanel from "./IslandPanel";
import NotificationsPanel from "./NotificationsPanel";
import SettingsPanel from "./SettingsPanel";
import RecommendPanel from "./RecommendPanel";
import CourseSheet from "./CourseSheet";
import BottomControls from "./BottomControls";

export default function AppScreen() {
  const mapRef = useRef<KakaoMapHandle>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");
  // 추천 패널이 수축된 뒤에 보여줄 코스 (AnimatePresence onExitComplete에서 소비)
  const pendingCourseRef = useRef<Course | null>(null);

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
    pendingCourseRef.current = null;
    setPanel(null);
    setSelectedCourse(null);
    mapRef.current?.resetView();
  }, []);

  // 목업: 희망 시간에 가장 가까운 코스를 추천한다. 패널이 버튼으로 줄어든 뒤 시트가 올라온다.
  const handleRecommendSubmit = useCallback((prefs: RecommendPrefs) => {
    const minutesOf = (c: Course) => parseInt(c.duration, 10) || 0;
    const match = [...COURSES].sort(
      (a, b) =>
        Math.abs(minutesOf(a) - prefs.minutes) -
        Math.abs(minutesOf(b) - prefs.minutes)
    )[0];
    pendingCourseRef.current = match;
    setPanel(null);
  }, []);

  const handlePanelExitComplete = useCallback(() => {
    if (pendingCourseRef.current) {
      setSelectedCourse(pendingCourseRef.current);
      pendingCourseRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app" data-map-style={mapStyle}>
        <KakaoMap
          ref={mapRef}
          courses={COURSES}
          selectedCourseId={selectedCourse?.id ?? null}
          onSelectCourse={handleSelectCourse}
        />
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

        <header className="top-bar">
          <BrandButton onClick={goHome} />
          <TopActions panel={panel} onOpen={openPanel} />
        </header>

        <AnimatePresence onExitComplete={handlePanelExitComplete}>
          {panel === "notifications" && (
            <IslandPanel
              key="notifications"
              layoutId="island-notifications"
              anchor="top"
              title="알림"
              onClose={closePanel}
            >
              <NotificationsPanel />
            </IslandPanel>
          )}
          {panel === "settings" && (
            <IslandPanel
              key="settings"
              layoutId="island-settings"
              anchor="top"
              title="설정"
              onClose={closePanel}
            >
              <SettingsPanel mapStyle={mapStyle} onMapStyleChange={setMapStyle} />
            </IslandPanel>
          )}
          {panel === "recommend" && (
            <IslandPanel
              key="recommend"
              layoutId="island-recommend"
              anchor="bottom"
              title="코스 추천"
              onClose={closePanel}
            >
              <RecommendPanel onSubmit={handleRecommendSubmit} />
            </IslandPanel>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedCourse && !panel && (
            <CourseSheet
              key={selectedCourse.id}
              course={selectedCourse}
              onClose={() => setSelectedCourse(null)}
            />
          )}
        </AnimatePresence>

        <BottomControls
          panel={panel}
          onOpenRecommend={() => openPanel("recommend")}
          onLocate={handleLocate}
        />
      </div>
    </MotionConfig>
  );
}
