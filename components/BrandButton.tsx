"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";

/**
 * 좌상단 '오늘의길' 버튼. 어떤 팝업/화면에서도 유지되며,
 * 클릭하면 처음 화면으로 돌아간다. 밝은 표면과 잎 로고를 사용한다.
 */
export default function BrandButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      className="brand-pill"
      aria-label="처음 화면으로 돌아가기"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={softSpring}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/leaf-logo.png"
        alt=""
        className="brand-icon"
        draggable={false}
      />
      <span className="brand-label">오늘의길</span>
    </motion.button>
  );
}
