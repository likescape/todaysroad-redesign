"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { COURSES, type Course } from "@/lib/courses";
import type { Panel, RecommendPrefs } from "@/lib/types";
import { useTheme } from "./ThemeProvider";
import { PREVIEW_COURSE } from "@/lib/walk";
import { createWalkRecord, formatDuration, type CourseAttachment } from "@/lib/journal";
import { useJournal } from "@/lib/useJournal";
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
import WalkOverlay from "./WalkOverlay";
import WalkRecordScreen, { SharedCourseScreen } from "./WalkRecordScreen";
import WalkRecordsScreen from "./WalkRecordsScreen";
import CommunityScreen, { CommunityPostScreen } from "./CommunityScreen";
import PostComposer from "./PostComposer";
import { ConfirmDialog, EmptyState, ErrorMessage, ScreenHeader } from "./JournalUI";

/** 지도 위 경로 그리기 애니메이션 길이 */
const ROUTE_DRAW_MS = 1600;
type JournalScreen =
  | { kind: "record"; id: string; completed?: boolean }
  | { kind: "records" }
  | { kind: "compose"; recordId?: string; postId?: string }
  | { kind: "post"; id: string }
  | { kind: "course"; course: CourseAttachment };

export default function AppScreen() {
  const [tab, setTab] = useState<Tab>("home");
  const [communityMine, setCommunityMine] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const { theme } = useTheme();
  const [walk, setWalk] = useState<{ course: Course; startedAt: number } | null>(null);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const activeCourse = walk?.course ?? selectedCourse;
  const journal = useJournal();
  const [screens, setScreens] = useState<JournalScreen[]>([]);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [notice, setNotice] = useState("");
  const activeScreen = screens[screens.length - 1];
  const pushScreen = (screen: JournalScreen) => setScreens(current => [...current, screen]);
  const popScreen = () => setScreens(current => current.slice(0, -1));
  const openCourse = (course: CourseAttachment) => pushScreen({ kind: "course", course });
  const totalDistance = walk ? parseFloat(walk.course.distance) : 0;
  const walkProgress = walk ? Math.min(1, walkSeconds / (parseFloat(walk.course.duration) * 60)) : null;
  const walkedDistance = totalDistance * (walkProgress ?? 0);
  // 지도에 표시할 예시·기록 코스 경로
  const [route, setRoute] = useState<Course["path"] | null>(null);
  const lastPrefsRef = useRef<RecommendPrefs | null>(null);
  // 추천 패널이 닫힌 뒤 고정 예시를 표시한다.
  const pendingPreviewRef = useRef(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview !== "walk" && preview !== "course") return;
    const course = PREVIEW_COURSE;
    setRoute(course.path ?? null);
    if (preview === "course") {
      setSelectedCourse(course);
      return;
    }
    setWalk({ course, startedAt: Date.now() - 805_000 });
    setWalkSeconds(805);
  }, []);

  useEffect(() => {
    if (!walk) return;
    const update = () => setWalkSeconds(Math.max(0, Math.floor((Date.now() - walk.startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [walk]);

  const handleSelectCourse = useCallback((course: Course | null) => {
    if (walk) return;
    pendingPreviewRef.current = false;
    setSelectedCourse(course);
    setRoute(course?.path ?? null);
  }, [walk]);

  const handleLocate = useCallback(() => {
    mapRef.current?.moveToCurrentLocation();
  }, []);

  const openPanel = useCallback((next: Exclude<Panel, null>) => {
    pendingPreviewRef.current = false;
    setSelectedCourse(null);
    setRoute(null);
    setPanel(next);
  }, []);

  const closePanel = useCallback(() => {
    pendingPreviewRef.current = false;
    setPanel(null);
  }, []);

  // '오늘의길' 버튼: 어떤 상태에서든 처음 화면으로
  const goHome = useCallback(() => {
    setTab("home");
    setSettingsOpen(false);
    pendingPreviewRef.current = false;
    setPanel(null);
    setSelectedCourse(null);
    setScreens([]);
    setConfirmFinish(false);
    if (!walk) {
      setRoute(null);
      mapRef.current?.resetView();
    }
  }, [walk]);

  const startWalk = (course = selectedCourse) => {
    if (walk || !course) return;
    if (!course.path || course.path.length < 2) { openPanel("recommend"); return; }
    pendingPreviewRef.current = false;
    setRoute(course.path);
    setWalk({ course, startedAt: Date.now() });
    setWalkSeconds(0);
    setSelectedCourse(null);
    setPanel(null);
    setScreens([]);
    setSettingsOpen(false);
    setTab("home");
  };

  const startRecordedWalk = (source: CourseAttachment) => {
    if (walk || source.path.length < 2) return;
    const course: Course = {
      id: `record-${source.recordId}`,
      markerName: source.title,
      markerMeta: `${source.distance}km`,
      title: source.title,
      distance: `${source.distance}km`,
      duration: `${Math.max(1, Math.round(source.seconds / 60))}분`,
      difficulty: "—",
      description: "기록에 남겨진 길을 따라 산책해요.",
      ...source.path[0],
      path: source.path.map(point => ({ ...point })),
    };
    startWalk(course);
  };

  const finishWalk = () => {
    if (!walk) return;
    const record = createWalkRecord(walk.course, walk.startedAt);
    try { journal.storeRecord(record); }
    catch (error) { setFinishError(error instanceof Error ? error.message : "산책을 저장하지 못했어요."); return; }
    setConfirmFinish(false);
    setFinishError("");
    setScreens([{ kind: "record", id: record.id, completed: true }]);
    setWalk(null);
    setRoute(null);
    setSelectedCourse(null);
    // A refresh after ending should not re-enter the preview session.
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    window.history.replaceState(null, "", url);
  };

  // 조건 선택 UI는 보존하되, 이미지 분석 없이 같은 예시 코스를 연다.
  const handleRecommendSubmit = useCallback((prefs: RecommendPrefs) => {
    lastPrefsRef.current = prefs;
    pendingPreviewRef.current = true;
    setPanel(null);
  }, []);

  const handlePanelExitComplete = useCallback(() => {
    if (!pendingPreviewRef.current) return;
    pendingPreviewRef.current = false;
    handleSelectCourse(PREVIEW_COURSE);
  }, [handleSelectCourse]);

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
      <div id="todaysroad-app" className="app" data-map-style={theme} data-walking={Boolean(walk)} data-course-selected={Boolean(selectedCourse)}>
        <div className="app-base" inert={settingsOpen || screens.length > 0 || confirmFinish}>
        <div className="map-layer" inert={tab !== "home"}>
        <KakaoMap
          ref={mapRef}
          courses={COURSES}
          selectedCourseId={selectedCourse?.id ?? null}
          onSelectCourse={handleSelectCourse}
          route={route}
          routeDrawMs={ROUTE_DRAW_MS}
          walkProgress={walkProgress}
          waypoints={activeCourse?.imageAnalysis?.waypoints}
        />
        </div>
        {tab === "my" && <ProfileScreen records={journal.records} onOpenRecord={record => pushScreen({ kind: "record", id: record.id })} onAllRecords={() => pushScreen({ kind: "records" })} onHome={goHome} onSettings={() => setSettingsOpen(true)} />}
        {tab === "community" && <CommunityScreen posts={journal.posts} mine={communityMine} onFilterChange={setCommunityMine} ready={journal.ready} error={journal.error} onRetry={journal.reload} onHome={goHome} onWrite={() => pushScreen({ kind: "compose" })} onOpen={post => pushScreen({ kind: "post", id: post.id })} onCourse={openCourse} />}

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

        {!settingsOpen && tab === "home" && <header className="top-bar">
          <BrandButton onClick={goHome} integrated={panel !== null} />
          {tab === "home" && !panel && <div className="top-actions">
            {walk && <button type="button" className="icon-button walk-stop" aria-label="산책 종료" title="산책 종료" onClick={() => { setFinishError(""); setConfirmFinish(true); }}><span aria-hidden="true" /></button>}
            <button className="icon-button" aria-label="설정" onClick={() => setSettingsOpen(true)}><UiIcon name="gear" /></button>
          </div>}
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
              <RecommendPanel onSubmit={handleRecommendSubmit} initialPrefs={lastPrefsRef.current} />
            </IslandPanel>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedCourse && !walk && !panel && tab === "home" && !settingsOpen && (
            <CourseSheet
              key={selectedCourse.id}
              course={selectedCourse}
              onClose={() => handleSelectCourse(null)}
              onStart={() => startWalk()}
              onLocate={handleLocate}
            />
          )}
        </AnimatePresence>

        {walk && tab === "home" && !settingsOpen && <WalkOverlay seconds={walkSeconds} distance={walkedDistance} remaining={Math.max(0, totalDistance - walkedDistance)} onLocate={handleLocate} />}
        {!walk && !selectedCourse && tab === "home" && !settingsOpen && <BottomControls
          panel={panel}
          onLocate={handleLocate}
        />}
        {!settingsOpen && <BottomNav tab={tab} onChange={(next) => { goHome(); setTab(next); if (next === "home") openPanel("recommend"); }} />}
        </div>
        <StatusBar />
        {settingsOpen && <SettingsScreen onBack={() => setSettingsOpen(false)} />}
        {activeScreen && (() => {
          const key = `${screens.length}-${activeScreen.kind}`;
          if (activeScreen.kind === "records") return <WalkRecordsScreen key={key} records={journal.records} onBack={popScreen} onOpen={record => pushScreen({ kind: "record", id: record.id })} />;
          if (activeScreen.kind === "course") return <SharedCourseScreen key={key} course={activeScreen.course} onBack={popScreen} onWalk={startRecordedWalk} walking={Boolean(walk)} />;
          if (activeScreen.kind === "compose") {
            const post = journal.posts.find(item => item.id === activeScreen.postId);
            if (!activeScreen.postId || post) return <PostComposer key={key} records={journal.records} record={journal.records.find(item => item.id === activeScreen.recordId)} post={post} onBack={popScreen} onSave={draft => {
              const id = journal.storePost(draft);
              setCommunityMine(draft.visibility === "private");
              setScreens(current => current[current.length - 2]?.kind === "post" ? current.slice(0, -1) : [...current.slice(0, -1), { kind: "post", id }]);
              setNotice(draft.id ? "이야기를 수정했어요" : draft.visibility === "public" ? "산책 이야기를 올렸어요" : "나만의 이야기를 저장했어요");
            }} />;
          }
          if (activeScreen.kind === "record") {
            const record = journal.records.find(item => item.id === activeScreen.id);
            if (record) return <WalkRecordScreen key={key} record={record} completed={activeScreen.completed} onBack={() => { if (activeScreen.completed) setTab("my"); popScreen(); }} onWrite={next => pushScreen({ kind: "compose", recordId: next.id })} onWalk={startRecordedWalk} walking={Boolean(walk)} />;
          }
          if (activeScreen.kind === "post") {
            const post = journal.posts.find(item => item.id === activeScreen.id);
            if (post) return <CommunityPostScreen key={key} post={post} onBack={popScreen} onCourse={openCourse} onEdit={() => pushScreen({ kind: "compose", postId: post.id })} onDelete={() => { journal.removePost(post.id); popScreen(); setNotice("이야기를 삭제했어요"); }} />;
          }
          return <section className="page-surface journal-page"><ScreenHeader title="기록 보기" onBack={popScreen} /><div className="journal-scroll"><EmptyState title="기록을 찾을 수 없어요" description="삭제되었거나 다른 창에서 변경된 기록이에요." /></div></section>;
        })()}
        {confirmFinish && <ConfirmDialog title="산책을 마칠까요?" description={`${formatDuration(walkSeconds)} 동안 ${walkedDistance.toFixed(2)}km를 걸었어요. 지금까지 걸은 길을 기록으로 남겨드릴게요.`} confirmLabel="산책 마치기" danger onCancel={() => setConfirmFinish(false)} onConfirm={finishWalk} error={finishError} />}
        {journal.error && tab !== "community" && !activeScreen && <div className="storage-notice"><ErrorMessage message={journal.error} onRetry={journal.reload} /></div>}
        {notice && <div className="journal-toast" role="status"><UiIcon name="check" />{notice}</div>}
      </div>
    </MotionConfig>
  );
}
