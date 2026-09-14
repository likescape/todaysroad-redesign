"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";
import BrandIcon from "./BrandIcon";

/**
 * 좌상단 '오늘의길' 버튼. 어떤 팝업/화면에서도 유지되며,
 * 클릭하면 처음 화면으로 돌아간다. 기본은 마크와 글자, iconOnly는 원형 로고다.
 */
export default function BrandButton({ onClick, integrated = false, iconOnly = false }: { onClick: () => void; integrated?: boolean; iconOnly?: boolean }) {
  return (
    <motion.button
      type="button"
      className={`brand-pill${integrated ? " brand-pill--integrated" : ""}${iconOnly ? " brand-pill--icon-only" : ""}`}
      aria-label="오늘의길 처음 화면으로 돌아가기"
      title="오늘의길"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      initial={false}
      animate={{ boxShadow: integrated ? "0 4px 12px #00000000" : "var(--shadow-float)" }}
      transition={{ ...softSpring, boxShadow: { duration: 0.24 } }}
    >
      <BrandIcon className="brand-icon" />
      {!iconOnly && <span className="brand-label">오늘의길</span>}
    </motion.button>
  );
}
