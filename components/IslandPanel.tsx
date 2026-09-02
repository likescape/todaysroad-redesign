"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { contentReveal, islandSpring } from "@/lib/motion";

/**
 * 버튼에서 확장되는 검정 팝업. `layoutId`가 같은 버튼의 위치·크기에서
 * 스프링으로 커지고, 닫힐 때 다시 버튼으로 줄어든다.
 * 닫기(X) 버튼은 원래 버튼이 있던 우상단 자리에 놓인다.
 */
export default function IslandPanel({
  layoutId,
  anchor,
  title,
  onClose,
  children,
}: {
  layoutId: string;
  anchor: "top" | "bottom";
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.section
      layoutId={layoutId}
      className={`island-panel island-panel--${anchor}`}
      style={{ borderRadius: 30 }}
      transition={islandSpring}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        layout
        className="island-inner"
        initial={contentReveal.initial}
        animate={contentReveal.animate}
        exit={contentReveal.exit}
        transition={contentReveal.transition}
      >
        <header className="island-head">
          <motion.button
            type="button"
            className="island-close"
            aria-label="닫기"
            onClick={onClose}
            whileTap={{ scale: 0.86 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>
        </header>
        <h2 className="island-title">{title}</h2>
        <div className="island-body">{children}</div>
      </motion.div>
    </motion.section>
  );
}
