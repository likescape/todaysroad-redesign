"use client";

import { motion } from "motion/react";
import type { Course } from "@/lib/courses";
import { islandSpring } from "@/lib/motion";

export default function CourseSheet({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  return (
    <motion.section
      className="course-sheet"
      aria-label="추천 코스 정보"
      initial={{ y: 48, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 36, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={islandSpring}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-label="닫기"
        onClick={onClose}
      >
        <span />
      </button>
      <div className="sheet-eyebrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5c.5 3.9 2 6.6 5.5 7.5-3.5.9-5 3.6-5.5 7.5-.5-3.9-2-6.6-5.5-7.5 3.5-.9 5-3.6 5.5-7.5z" />
          <path d="M19.5 14c.3 1.8 1 3 2.5 3.4-1.5.4-2.2 1.6-2.5 3.4-.3-1.8-1-3-2.5-3.4 1.5-.4 2.2-1.6 2.5-3.4z" />
        </svg>
        추천 코스
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
          <div className="sheet-photo" role="img" aria-label="코스 사진">
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="sheet-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#b6d9a0" />
                  <stop offset="1" stopColor="#5d9c53" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" fill="url(#sheet-sky)" />
              <path d="M42 100 L48 40 L52 40 L58 100 Z" fill="#d9d4c8" />
              <path
                d="M48.8 55 L51.2 55 M48 70 L52 70 M47 88 L53 88"
                stroke="#a8a291"
                strokeWidth="1.6"
              />
              <ellipse cx="20" cy="38" rx="14" ry="16" fill="#3f7a3c" />
              <ellipse cx="80" cy="34" rx="15" ry="17" fill="#356f35" />
              <ellipse cx="34" cy="24" rx="12" ry="13" fill="#4c8a45" />
              <ellipse cx="66" cy="20" rx="12" ry="13" fill="#468243" />
            </svg>
          </div>
          <button type="button" className="sheet-more" aria-label="코스 상세 보기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5.5 15.5 12 9 18.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <p className="sheet-desc">{course.description}</p>
    </motion.section>
  );
}
