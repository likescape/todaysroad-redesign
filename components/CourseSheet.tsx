"use client";

import BrandIcon from "./BrandIcon";
import { motion } from "motion/react";
import type { Course } from "@/lib/courses";
import { islandSpring } from "@/lib/motion";
import LocateButton from "./LocateButton";
import { CourseStories } from "./SpotUI";
import type { ResolvedSpot } from "@/lib/spots";
import MapAnalysisPreview from "./MapAnalysisPreview";

export default function CourseSheet({
  course,
  onClose,
  onStart,
  onLocate,
  spots,
  selectedSpotId,
  onSelectSpot,
  onAllStories,
}: {
  course: Course;
  onClose: () => void;
  onStart: () => void;
  onLocate: () => void;
  spots: ResolvedSpot[];
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  onAllStories: () => void;
}) {
  return (
    <motion.section
      className="course-preview"
      aria-label="추천 코스 정보"
      initial={{ y: 48, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 36, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={islandSpring}
    >
      <LocateButton className="course-locate" onClick={onLocate} />
      <div className="course-sheet">
      <button
        type="button"
        className="sheet-handle"
        aria-label="닫기"
        onClick={onClose}
      >
        <span />
      </button>
      <div className="course-sheet-scroll">
      <div className="sheet-eyebrow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <BrandIcon size={18} />
        {course.id === "dev-spot-route" ? "개발 미리보기 · 가상 경로" : course.generated ? "방금 만든 오늘의 코스" : "오늘의 추천 코스"}
      </div>
      <div className="sheet-body">
        <div className="sheet-info">
          <h2 className="sheet-title">{course.title}</h2>
          <div className="sheet-chips">
            <span className="chip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 16.5c0-1.2.8-2.2 2-2.7l3.6-1.5 2-4.8c.3-.7 1-1.1 1.7-1 1 .1 2.5.6 3.7 2 .9 1 2.7 1.6 4 1.9.9.2 1.5 1 1.5 1.9v2.2c0 1.7-1.3 3-3 3H6c-1.7 0-3-.4-3-1zm0 3h18v1.2c0 .4-.3.8-.8.8H3.8a.8.8 0 0 1-.8-.8V19.5z" />
              </svg>
              {course.distance}
            </span>
            <span className="chip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 7.5V12l3 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {course.duration}
            </span>
            <span className="chip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#d79422">
                <rect x="4" y="13" width="4" height="7" rx="1" />
                <rect x="10" y="9" width="4" height="11" rx="1" />
                <rect x="16" y="5" width="4" height="15" rx="1" />
              </svg>
              {course.difficulty}
            </span>
          </div>
        </div>
        <div className="sheet-photo-wrap">
          <div className="sheet-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={course.imageAnalysis?.snapshot ?? "/assets/example-thumbnail.jpg"} alt={course.imageAnalysis ? "코스를 만든 지도 이미지" : "코스 사진"} draggable={false} />
          </div>
        </div>
      </div>
      <p className="sheet-desc">{course.description}</p>
      {course.imageAnalysis && <>
        <ol className="image-waypoints" aria-label="이미지에서 찾은 경유지">{course.imageAnalysis.waypoints.map((point, index) => <li key={point.featureId}><b>{index + 1}</b>{point.label}<small>주변 길</small></li>)}</ol>
        <div className="image-route-notes">{course.imageAnalysis.notes.map(note => <p key={note}>{note}</p>)}</div>
        <details className="image-route-evidence"><summary>지도에서 찾은 요소 보기</summary><MapAnalysisPreview image={course.imageAnalysis.snapshot} segmentation={course.imageAnalysis.segmentation} pixels={course.imageAnalysis.pixels} waypoints={course.imageAnalysis.waypoints} /></details>
      </>}
      <CourseStories spots={spots} selectedId={selectedSpotId} onSelect={onSelectSpot} onShowAll={onAllStories} />
      </div>
      <button type="button" className="walk-start" onClick={onStart}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3.8c0-.8.9-1.3 1.6-.9l13 8.2a1 1 0 0 1 0 1.8l-13 8.2c-.7.4-1.6-.1-1.6-.9V3.8Z" /></svg>
        {course.path?.length ? "산책 시작" : "주변 코스 만들기"}
      </button>
      </div>
    </motion.section>
  );
}
