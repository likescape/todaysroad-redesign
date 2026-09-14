"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoSdk } from "./KakaoMap";
import { captureMapSnapshot, locateForSnapshot } from "@/lib/map-snapshot";
import { parseSegmentation, type MapSegmentation, type MapSnapshot } from "@/lib/map-segmentation";
import { createImageRouteTrace, planImageRoute, type ImageRoutePlan, type ImageRouteTrace } from "@/lib/image-route-planner";
import { GENERATION_STEPS, MOOD_TAGS, courseFromImagePlan } from "@/lib/recommend";
import { IMAGE_ANALYSIS_TIMEOUT_MS } from "@/lib/map-vision-config";
import MapAnalysisPreview from "./MapAnalysisPreview";
import type { RecommendPrefs } from "@/lib/types";

const LOCATIONS = [
  { name: "서울 · 신수동", lat: 37.5485, lng: 126.9335 },
  { name: "부산 · 시민공원", lat: 35.1684, lng: 129.0577 },
  { name: "제주 · 탑동", lat: 33.5163, lng: 126.5230 },
];
const STEP_NAMES = ["지도 캡처", "요소 구분", "전략 구성", "필터링", "경유지 선정", "길 연결", "코스 완성"];
export default function ImageRouteLab() {
  const [location, setLocation] = useState("0"), [minutes, setMinutes] = useState<RecommendPrefs["minutes"]>(30), [tags, setTags] = useState(["nature", "urban"]);
  const [snapshot, setSnapshot] = useState<MapSnapshot>(), [segmentation, setSegmentation] = useState<MapSegmentation>();
  const [plan, setPlan] = useState<ImageRoutePlan>(), [trace, setTrace] = useState<ImageRouteTrace>();
  const [step, setStep] = useState(1), [reached, setReached] = useState(1);
  const [status, setStatus] = useState("위치와 산책 조건을 고른 뒤 지도를 캡처하세요."), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [provider, setProvider] = useState("");
  const task = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/map-segmentation", { signal: controller.signal }).then(r => r.json()).then(body => setProvider(body.available ? body.provider === "codex" ? "로컬 Codex 연결됨" : "OpenAI API 연결됨" : "분석 연결 확인 필요")).catch(() => {});
    return () => { controller.abort(); task.current?.abort(); };
  }, []);
  const reset = () => { setSnapshot(undefined); setSegmentation(undefined); setPlan(undefined); setTrace(undefined); setStep(1); setReached(1); setError(""); setStatus("변경한 조건으로 지도를 다시 캡처하세요."); };
  const cancel = () => { task.current?.abort(); task.current = null; setBusy(false); setStatus("취소했어요. 현재 지도에서 다시 진행할 수 있어요."); };
  const capture = async () => {
    reset();
    const controller = new AbortController(); task.current = controller; setBusy(true); setStatus("1 / 7 · 지도 캡처 중…");
    try {
      const origin = location === "current" ? await locateForSnapshot(controller.signal) : LOCATIONS[Number(location)];
      const result = await captureMapSnapshot(await loadKakaoSdk(), origin, minutes, controller.signal);
      controller.signal.throwIfAborted();
      setSnapshot(result); setStatus("지도 캡처 완료. 이 이미지로 2~7단계를 진행하세요.");
    } catch (failure) { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "캡처 실패"); setStatus("지도 캡처를 완료하지 못했어요."); } }
    finally { if (task.current === controller) { task.current = null; setBusy(false); } }
  };
  const connect = (segments: MapSegmentation, source: MapSnapshot) => {
    const currentTrace = createImageRouteTrace();
    try {
      const route = planImageRoute(segments, source, { minutes, tags }, undefined, currentTrace);
      setPlan(route); setReached(7); setStep(7); setStatus("7 / 7 · 캡처한 지도에서 코스를 연결했어요.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "경로 연결 실패");
      setReached(currentTrace.step); setStep(currentTrace.step); setStatus(`${currentTrace.step} / 7 단계에서 연결을 멈췄어요.`);
    } finally { setTrace(currentTrace); }
  };
  const analyze = async () => {
    if (!snapshot || !tags.length) return;
    const controller = new AbortController(); task.current = controller; setBusy(true); setError(""); setPlan(undefined); setTrace(undefined);
    setStep(2); setReached(2); setStatus("2 / 7 · 지도에서 길과 요소를 읽고 있어요. 수 분 걸릴 수 있어요.");
    try {
      // Retry only the deterministic route search when image segmentation is already available.
      let segments = segmentation;
      if (!segments) {
        const response = await fetch("/api/map-segmentation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: snapshot.image }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(IMAGE_ANALYSIS_TIMEOUT_MS)]) });
        const body = await response.json(); if (!response.ok) throw new Error(body.error || "지도 분석 실패");
        controller.signal.throwIfAborted();
        segments = parseSegmentation(body.segmentation); setSegmentation(segments);
      }
      controller.signal.throwIfAborted(); connect(segments, snapshot);
    } catch (failure) { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "분석 실패"); setStatus("이미지 분석을 완료하지 못했어요."); } }
    finally { if (task.current === controller) { task.current = null; setBusy(false); } }
  };
  const visibleSegments = step >= 2 ? segmentation : undefined;
  const selectedWaypoints = step >= 5 ? plan?.waypoints : undefined;
  const previewSegments = visibleSegments && step >= 4 ? { ...visibleSegments, roads: visibleSegments.roads.filter(r => trace?.acceptedRoadIds.includes(r.id)) } : visibleSegments;
  const notes = plan && snapshot ? courseFromImagePlan(snapshot, { minutes, tags }, plan).imageAnalysis?.notes : [];
  const updateTags = (id: string) => {
    setTags(previous => previous.includes(id) ? previous.filter(t => t !== id) : [...previous, id]);
    setPlan(undefined); setTrace(undefined); setReached(segmentation ? 2 : 1); setStep(segmentation ? 2 : 1); setError(""); setStatus("변경한 카테고리로 길을 다시 연결하세요.");
  };
  const useRoadStart = () => {
    if (!snapshot || !segmentation || !trace?.nearestRoad) return;
    const pixel = trace.nearestRoad.pixel;
    const source = { ...snapshot, originPixel: pixel, origin: snapshot.toLatLng(pixel) };
    setSnapshot(source); setError(""); connect(segmentation, source);
  };
  return <main className="image-route-lab">
    <header className="ir-header"><div><a href="/">← 오늘의길</a><h1>지도에서 산책 코스까지</h1><p>실제 카카오 지도 위에서 7단계 결과를 확인하세요.</p></div><span className="ir-provider">{provider || "연결 확인 중…"}</span></header>
    <section className="ir-controls" aria-label="산책 조건">
      <div className="ir-inputs"><label>출발 위치<select value={location} onChange={event => { setLocation(event.target.value); reset(); }} disabled={busy}><option value="current">내 현재 위치</option>{LOCATIONS.map((item, i) => <option key={item.name} value={String(i)}>{item.name}</option>)}</select></label>
      <label>희망 시간<select value={minutes} onChange={event => { setMinutes(Number(event.target.value) as RecommendPrefs["minutes"]); reset(); }} disabled={busy}>{[15, 30, 60, 90].map(n => <option key={n} value={n}>{n}분</option>)}</select></label></div>
      <div className="ir-tags" aria-label="카테고리">{MOOD_TAGS.map(tag => <button key={tag.id} type="button" disabled={busy} aria-pressed={tags.includes(tag.id)} onClick={() => updateTags(tag.id)}>{tag.emoji} {tag.label}</button>)}</div>
      <div className="ir-actions"><button type="button" disabled={busy} onClick={() => void capture()}>1. 지도 캡처</button><button className="ir-primary" type="button" disabled={busy || !snapshot || !tags.length} onClick={() => void analyze()}>{segmentation ? "2~7. 조건으로 다시 연결" : "2~7. 분석하고 코스 만들기"}</button>{busy && <button type="button" onClick={cancel}>취소</button>}</div>
      <p className="ir-note">선택한 위치의 지도 이미지로 분석합니다. 로컬 Codex는 이 기기의 로그인을 사용하며, 이미지 분석은 OpenAI 서버에서 처리됩니다.</p>
    </section>
    <nav className="ir-steps" aria-label="진행 단계">{STEP_NAMES.map((name, index) => <button type="button" key={name} disabled={index + 1 > reached} aria-pressed={step === index + 1} onClick={() => setStep(index + 1)}><b>{index + 1}</b>{name}</button>)}</nav>
    <div className="ir-status" role="status" aria-live="polite">{status}</div>
    {error && <p className="ir-error" role="alert">{error}</p>}
    {!busy && location !== "current" && trace?.nearestRoad && trace.nearestRoad.offsetMeters > 60 && <div className="ir-start-choice"><p>테스트 좌표에서 인식된 길까지 약 {Math.round(trace.nearestRoad.offsetMeters)}m 떨어져 있어요. 같은 지도에서 테스트 출발점을 길 위로 옮길 수 있어요.</p><button type="button" onClick={useRoadStart}>가까운 길을 테스트 출발점으로 선택</button></div>}
    <div className="ir-workspace"><section className="ir-map" aria-label="지도 분석 결과">
      {snapshot ? <MapAnalysisPreview image={snapshot.image} segmentation={previewSegments} pixels={step >= 6 ? plan?.pixels : undefined} waypoints={selectedWaypoints} origin={snapshot.originPixel} showNodes={step === 2} excludedRoadIds={step === 3 ? trace?.excludedRoads.map(r => r.id) : undefined} candidateFeatureIds={step >= 4 ? trace?.candidateFeatureIds : undefined} /> : <div className="ir-empty"><span>01</span><h2>주변 지도를 담아주세요</h2><p>지도를 캡처하면 이곳에서 원본 이미지와 분석 결과를 겹쳐 볼 수 있어요.</p></div>}
    </section><aside className="ir-detail"><span className="ir-step-count">{String(step).padStart(2, "0")} / 07</span><h2>{GENERATION_STEPS[step - 1]}</h2>
      {step === 1 && <><p>선택한 위치 주변의 카카오 지도를 1024×1024 이미지로 캡처합니다. 테스트 위치는 인식된 길 위로 출발점을 옮길 수 있어요.</p>{snapshot && <dl><dt>출발 좌표</dt><dd>{snapshot.origin.lat.toFixed(5)}, {snapshot.origin.lng.toFixed(5)}</dd><dt>지도 레벨</dt><dd>{snapshot.level}</dd><dt>캡처 시각</dt><dd>{new Date(snapshot.capturedAt).toLocaleTimeString("ko-KR")}</dd></dl>}</>}
      {step === 2 && <><p>지도 이미지에서 읽은 길은 주황색 선, 교차점은 흰 점, 자연·물·건물은 영역으로 표시합니다.</p>{segmentation && <dl><dt>길 / 교차점</dt><dd>{segmentation.roads.length} / {segmentation.nodes.length}</dd><dt>영역·아이콘</dt><dd>{segmentation.features.length}</dd></dl>}</>}
      {step === 3 && trace && <><p>목표 {(trace.targetMeters / 1000).toFixed(1)}km · 시속 4km 기준. 출발 위치 주변에서 연결되는 길을 찾습니다.</p><dl><dt>사용할 길</dt><dd>{trace.acceptedRoadIds.length}개</dd><dt>제외한 길</dt><dd>{trace.excludedRoads.length}개 · 지도 위 빨간 점선</dd></dl>{trace.excludedRoads.length > 0 && <details><summary>제외 사유</summary><ul>{trace.excludedRoads.map(r => <li key={r.id}>{r.id}: {r.reason}</li>)}</ul></details>}</>}
      {step === 4 && <><p>선택한 카테고리와 일치하고, 출발점에서 이어지는 길 옆의 장소만 남깁니다.</p><p>후보 {trace?.candidateFeatureIds.length ?? 0}개</p><ul>{segmentation?.features.filter(f => trace?.candidateFeatureIds.includes(f.id)).map(f => <li key={f.id}>{f.label}</li>)}</ul></>}
      {step === 5 && <><p>장소와 인접한 길의 연결점에 경유지를 배치합니다.</p><ol>{plan?.waypoints.map(w => <li key={w.featureId}>{w.label}</li>)}</ol>{!plan && <p>완성된 코스의 경유지가 아직 없습니다.</p>}</>}
      {step === 6 && <><p>인식된 길의 연결 관계를 따라 경유지를 방문하고 출발점으로 돌아옵니다.</p>{plan && <p>{plan.roadIds.length}개 길 연결 · {plan.retraces ? "일부 구간 왕복" : "연결 경로 완성"}</p>}</>}
      {step === 7 && plan && <><div className="ir-metrics"><strong>{(plan.distanceMeters / 1000).toFixed(2)}<small>km</small></strong><strong>{plan.durationMinutes}<small>분</small></strong></div><ol>{plan.waypoints.map(w => <li key={w.featureId}>{w.label}</li>)}</ol>{notes?.map(note => <p className="ir-note" key={note}>{note}</p>)}</>}
      {snapshot && <a className="ir-download" href={snapshot.image} download="kakao-map-snapshot.png">원본 지도 PNG 저장</a>}
      {snapshot && segmentation && <a className="ir-download" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ capturedAt: snapshot.capturedAt, origin: snapshot.origin, originPixel: snapshot.originPixel, bounds: { topLeft: snapshot.toLatLng({ x: 0, y: 0 }), bottomRight: snapshot.toLatLng({ x: 1000, y: 1000 }) }, level: snapshot.level, preferences: { minutes, tags }, segmentation, trace, plan }, null, 2))}`} download="image-route-analysis.json">분석 결과 JSON 저장</a>}
    </aside></div>
  </main>;
}
