"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { COURSES, type Course } from "@/lib/courses";
import type { Panel, RecommendPrefs } from "@/lib/types";
import { useTheme } from "./ThemeProvider";
import { generateImageCourse, GENERATION_STEPS, type GenerationStep } from "@/lib/recommend";
import { ImageRouteError } from "@/lib/map-segmentation";
import { IMAGE_COURSE_TIMEOUT_MS } from "@/lib/map-vision-config";
import { PREVIEW_COURSE } from "@/lib/walk";
import { attachCourseSpots, resolveCourseSpots, seoulDate } from "@/lib/spots";
import { SPOT_CATALOG } from "@/lib/spot-content";
import { SpotDetail, WalkStories } from "./SpotUI";
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
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const activeCourse = walk?.course ?? selectedCourse;
  const courseSpots = useMemo(() => resolveCourseSpots(activeCourse, SPOT_CATALOG), [activeCourse]);
  const selectedSpot = courseSpots.find(spot => spot.story.id === selectedSpotId);
  const clearSpotSelection = useCallback(() => { setSelectedSpotId(null); setStoriesOpen(false); }, []);
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
  // 지도에 그려진 생성 코스 경로와 '만드는 중' 연출 상태
  const [route, setRoute] = useState<Course["path"] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>(1);
  const [generationError, setGenerationError] = useState("");
  const generationRef = useRef<AbortController | null>(null);
  const lastPrefsRef = useRef<RecommendPrefs | null>(null);
  // 추천 패널이 수축된 뒤에 처리할 조건 (AnimatePresence onExitComplete에서 소비)
  const pendingPrefsRef = useRef<RecommendPrefs | null>(null);
  const generateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (process.env.NODE_ENV === "development" && preview === "spots") {
      let cancelled = false;
      import("@/lib/spot-preview").then(({ SPOT_PREVIEW_COURSE }) => {
        if (cancelled) return;
        const course = attachCourseSpots(SPOT_PREVIEW_COURSE, SPOT_CATALOG, seoulDate());
        setRoute(course.path ?? null);
        setSelectedCourse(course);
      });
      return () => { cancelled = true; };
    }
    if (preview !== "walk" && preview !== "course") return;
    const course = attachCourseSpots(PREVIEW_COURSE, SPOT_CATALOG, seoulDate());
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

  useEffect(
    () => () => {
      if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
      generationRef.current?.abort();
    },
    []
  );

  const cancelGeneration = useCallback(() => {
    generationRef.current?.abort();
    generationRef.current = null;
    pendingPrefsRef.current = null;
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    setGenerating(false);
  }, []);

  const handleSelectCourse = useCallback((course: Course | null) => {
    if (walk) return;
    clearSpotSelection();
    cancelGeneration();
    setGenerationError("");
    setSelectedCourse(course ? attachCourseSpots(course, SPOT_CATALOG, seoulDate()) : null);
    setRoute(course?.path ?? null);
  }, [walk, clearSpotSelection, cancelGeneration]);

  const handleLocate = useCallback(() => {
    mapRef.current?.moveToCurrentLocation();
  }, []);

  const openPanel = useCallback((next: Exclude<Panel, null>) => {
    cancelGeneration();
    setGenerationError("");
    clearSpotSelection();
    setSelectedCourse(null);
    setRoute(null);
    setPanel(next);
  }, [clearSpotSelection, cancelGeneration]);

  const closePanel = useCallback(() => setPanel(null), []);

  // '오늘의길' 버튼: 어떤 상태에서든 처음 화면으로
  const goHome = useCallback(() => {
    clearSpotSelection();
    setTab("home");
    setSettingsOpen(false);
    cancelGeneration();
    setGenerationError("");
    setPanel(null);
    setSelectedCourse(null);
    setScreens([]);
    setConfirmFinish(false);
    if (!walk) {
      setRoute(null);
      mapRef.current?.resetView();
    }
  }, [walk, clearSpotSelection, cancelGeneration]);

  const startWalk = (course = selectedCourse) => {
    if (walk || !course) return;
    if (!course.path || course.path.length < 2) { openPanel("recommend"); return; }
    cancelGeneration();
    setGenerationError("");
    clearSpotSelection();
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
    startWalk(attachCourseSpots(course, SPOT_CATALOG, seoulDate()));
  };

  const finishWalk = () => {
    if (!walk) return;
    const record = createWalkRecord(walk.course, walk.startedAt);
    try { journal.storeRecord(record); }
    catch (error) { setFinishError(error instanceof Error ? error.message : "산책을 저장하지 못했어요."); return; }
    setConfirmFinish(false);
    clearSpotSelection();
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

  // 추천 조건을 보관하고 패널을 닫는다. 실제 생성은 패널이 버튼으로 줄어든 뒤 시작.
  const handleRecommendSubmit = useCallback((prefs: RecommendPrefs) => {
    lastPrefsRef.current = prefs;
    pendingPrefsRef.current = prefs;
    setPanel(null);
  }, []);

  const runGeneration = useCallback(async (prefs: RecommendPrefs) => {
    cancelGeneration();
    const controller = new AbortController();
    generationRef.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(IMAGE_COURSE_TIMEOUT_MS)]);
    clearSpotSelection();
    setGenerationError("");
    setSelectedCourse(null);
    setGenerating(true);
    setRoute(null);
    setGenerationStep(1);
    try {
      const course = attachCourseSpots(await generateImageCourse((minutes, captureSignal) => {
        if (!mapRef.current) throw new ImageRouteError("MAP_UNAVAILABLE", "지도를 먼저 불러와야 해요. 잠시 후 다시 시도해주세요.");
        return mapRef.current.captureAroundCurrentPosition(minutes, captureSignal);
      }, prefs, step => { if (generationRef.current === controller && !signal.aborted) setGenerationStep(step); }, signal), SPOT_CATALOG, seoulDate());
      if (signal.aborted || generationRef.current !== controller) return;
      setRoute(course.path ?? null);
      generateTimerRef.current = setTimeout(() => {
        if (generationRef.current !== controller || controller.signal.aborted) return;
        setGenerating(false);
        setSelectedCourse(course);
        generationRef.current = null;
      }, ROUTE_DRAW_MS + 250);
    } catch (error) {
      if (controller.signal.aborted || generationRef.current !== controller) return;
      setGenerating(false);
      setRoute(null);
      setGenerationError(error instanceof ImageRouteError ? error.message : signal.aborted ? "코스 생성 시간이 초과됐어요. 다시 시도해주세요." : "코스를 만들지 못했어요. 네트워크 연결을 확인하고 다시 시도해주세요.");
      generationRef.current = null;
    }
  }, [clearSpotSelection, cancelGeneration]);

  const handlePanelExitComplete = useCallback(() => {
    const prefs = pendingPrefsRef.current;
    if (!prefs) return;
    pendingPrefsRef.current = null;
    void runGeneration(prefs);
  }, [runGeneration]);

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
          spots={courseSpots}
          selectedSpotId={selectedSpotId}
          onSelectSpot={setSelectedSpotId}
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

        {walk && activeCourse?.id === "dev-spot-route" && tab === "home" && !settingsOpen && <span className="spot-preview-label">개발 미리보기 · 가상 경로 / 위치 확인된 장소</span>}

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
          {generating && tab === "home" && !settingsOpen && (
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
              <span className="generation-stage"><small>{generationStep} / 7</small>{GENERATION_STEPS[generationStep - 1]}</span>
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
              <button type="button" className="generation-cancel" onClick={() => { cancelGeneration(); setRoute(null); }} aria-label="코스 생성 취소"><UiIcon name="close" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {generationError && tab === "home" && !settingsOpen && !panel && <div className="generation-error" role="alert">
          <strong>코스를 만들지 못했어요</strong><p>{generationError}</p>
          <div><button type="button" onClick={() => { if (lastPrefsRef.current) void runGeneration(lastPrefsRef.current); }}>다시 시도</button><button type="button" onClick={() => openPanel("recommend")}>조건 바꾸기</button><button type="button" onClick={() => setGenerationError("")} aria-label="코스 생성 오류 닫기">닫기</button></div>
        </div>}

        <AnimatePresence>
          {selectedCourse && !walk && !panel && tab === "home" && !settingsOpen && (
            <CourseSheet
              key={selectedCourse.id}
              course={selectedCourse}
              onClose={() => handleSelectCourse(null)}
              onStart={startWalk}
              onLocate={handleLocate}
              spots={courseSpots}
              selectedSpotId={selectedSpotId}
              onSelectSpot={setSelectedSpotId}
              onAllStories={() => setStoriesOpen(true)}
            />
          )}
        </AnimatePresence>

        {walk && tab === "home" && !settingsOpen && <WalkOverlay seconds={walkSeconds} distance={walkedDistance} remaining={Math.max(0, totalDistance - walkedDistance)} onLocate={handleLocate} spotCount={courseSpots.length} onStories={() => setStoriesOpen(true)} />}
        {!walk && !selectedCourse && !generating && tab === "home" && !settingsOpen && <BottomControls
          panel={panel}
          onLocate={handleLocate}
        />}
        {!settingsOpen && <BottomNav tab={tab} onChange={(next) => { goHome(); setTab(next); if (next === "home") openPanel("recommend"); }} />}
        </div>
        <StatusBar />
        {storiesOpen && <WalkStories spots={courseSpots} selectedId={selectedSpotId} onSelect={setSelectedSpotId} onClose={() => setStoriesOpen(false)} walking={Boolean(walk)} />}
        {selectedSpot && <SpotDetail story={selectedSpot.story} place={selectedSpot.place} onClose={() => setSelectedSpotId(null)} />}
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
