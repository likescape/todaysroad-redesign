"use client";

import BrandIcon from "./BrandIcon";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MAX_PHOTOS, formatDuration, routeDrawing, type CourseAttachment, type RoutePoint, type WalkPhoto } from "@/lib/journal";
import { readPhoto } from "@/lib/photos";
import UiIcon from "./UiIcon";

export function ScreenHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <header className="journal-header"><button className="journal-icon" type="button" aria-label="뒤로 가기" onClick={onBack}><UiIcon name="back" /></button><h1 ref={heading} tabIndex={-1}>{title}</h1><div className="journal-header-action">{action}</div></header>;
}

export function RoutePreview({ path, color = "#318737", compact = false }: { path: RoutePoint[]; color?: string; compact?: boolean }) {
  const points = routeDrawing(path);
  const first = points[0], last = points[points.length - 1];
  const loop = first && last && Math.hypot(first.x - last.x, first.y - last.y) < 12;
  return <div className={`route-preview${compact ? " route-preview-compact" : ""}`}>
    <span className="route-caption"><UiIcon name="route" /> 경로 미리보기</span>
    {points.length ? <svg viewBox="0 0 340 190" role="img" aria-label={`산책 경로, 좌표 ${path.length}개. 초록 원은 출발, 짙은 원은 도착 지점입니다.`}>
      <polyline className="route-halo" points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <polyline className="route-track" points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {first && <><circle className="route-start" cx={first.x} cy={first.y} r="7" fill="white" stroke={color} strokeWidth="4" /><text x={first.x} y={first.y + 23} textAnchor="middle" className="route-point-label">{loop ? "출발 · 도착" : "출발"}</text></>}
      {last && !loop && <><circle className="route-end" cx={last.x} cy={last.y} r="8" fill="#244b2b" stroke="white" strokeWidth="3" /><text x={last.x} y={last.y - 16} textAnchor="middle" className="route-point-label">도착</text></>}
    </svg> : <div className="route-unavailable"><UiIcon name="route" /><span>기록된 경로가 없어요</span></div>}
  </div>;
}

export function CourseAttachmentCard({ course, onClick }: { course: CourseAttachment; onClick?: () => void }) {
  const content = <><span className="attachment-map"><RoutePreview path={course.path} color={course.color} compact /></span><span className="attachment-info"><small>함께 걸은 코스</small><strong>{course.title}</strong><span>{course.distance.toFixed(2)}km <i>·</i> {formatDuration(course.seconds)}</span></span>{onClick && <UiIcon name="chevron" />}</>;
  return onClick ? <button type="button" className="course-attachment" onClick={onClick} aria-label={`${course.title} 코스 상세 보기`}>{content}</button> : <div className="course-attachment">{content}</div>;
}

export function Dialog({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    const siblings = (Array.from(backdrop.current?.parentElement?.children ?? []) as HTMLElement[]).filter(item => item !== backdrop.current && !item.inert);
    siblings.forEach(item => { item.inert = true; });
    const focusable = () => [...(element?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])]
      .filter(item => !item.closest('[inert]') && item.getClientRects().length > 0 && ![...(element?.querySelectorAll('details:not([open])') ?? [])].some(details => details.contains(item) && details.querySelector('summary') !== item));
    (focusable()[0] ?? element)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      // Only the top dialog owns keyboard events when a detail opens over a list.
      if (backdrop.current?.inert) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === "Tab") {
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); element?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      siblings.forEach(item => { item.inert = false; });
      previous?.focus();
    };
  }, []);
  const root = typeof document === "undefined" ? null : document.getElementById("todaysroad-app");
  if (!root) return null;
  return createPortal(<div ref={backdrop} className="journal-scrim" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={panel} tabIndex={-1} className={`journal-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={id}><div className="dialog-handle" /><h2 id={id}>{title}</h2>{children}</div></div>, root);
}

export function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm, danger = false, error }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; danger?: boolean; error?: string }) {
  return <Dialog title={title} onClose={onCancel}><p className="dialog-description">{description}</p>{error && <ErrorMessage message={error} />}<div className="dialog-actions"><button type="button" className="journal-secondary" onClick={onCancel}>{confirmLabel === "산책 마치기" ? "계속 걷기" : "취소"}</button><button type="button" className={`journal-primary${danger ? " danger" : ""}`} onClick={onConfirm}>{confirmLabel}</button></div></Dialog>;
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="journal-error" role="alert"><UiIcon name="info" /><span>{message}</span>{onRetry && <button type="button" onClick={onRetry}>다시 시도</button>}</div>;
}

export function PhotoGallery({ photos }: { photos: WalkPhoto[] }) {
  const [selected, setSelected] = useState<WalkPhoto | null>(null);
  if (!photos.length) return null;
  return <><div className={`photo-gallery${photos.length === 1 ? " single" : ""}`}>{photos.map((photo, i) => <button key={photo.id} type="button" onClick={() => setSelected(photo)} aria-label={`사진 ${i + 1} 크게 보기`}><img src={photo.src} alt={photo.name} loading="lazy" /></button>)}</div>{selected && <Dialog title="산책 사진" onClose={() => setSelected(null)} className="photo-dialog"><img src={selected.src} alt={selected.name} /><button type="button" className="journal-secondary" onClick={() => setSelected(null)}>닫기</button></Dialog>}</>;
}

export function PhotoPicker({ photos, onChange, onBusy }: { photos: WalkPhoto[]; onChange: (photos: WalkPhoto[]) => void; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="photo-picker"><div className="photo-picker-row">{photos.map((photo, index) => <div className="photo-picked" key={photo.id}><img src={photo.src} alt={photo.name} /><button type="button" disabled={busy} aria-label={`사진 ${index + 1} 삭제`} onClick={() => onChange(photos.filter(item => item.id !== photo.id))}><UiIcon name="close" /></button></div>)}{photos.length < MAX_PHOTOS && <button type="button" className="photo-add" disabled={busy} onClick={() => input.current?.click()}><UiIcon name="image" /><span>{busy ? "불러오는 중" : "사진 추가"}</span><small>{photos.length}/{MAX_PHOTOS}</small></button>}</div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="산책 사진 선택" onChange={async event => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    if (files.length + photos.length > MAX_PHOTOS) { setError("사진은 최대 5장까지 첨부할 수 있어요."); return; }
    setBusy(true); onBusy(true);
    try { const added = await Promise.all(files.map(readPhoto)); onChange([...photos, ...added]); }
    catch (err) { setError(err instanceof Error ? err.message : "사진을 불러오지 못했어요."); }
    finally { setBusy(false); onBusy(false); }
  }} /><p className="field-hint">JPG, PNG, WebP · 한 장당 10MB 이하</p>{error && <ErrorMessage message={error} />}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="journal-empty"><span className="empty-leaf"><BrandIcon size={37} /></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
