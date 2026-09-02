"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";

/**
 * 좌상단 '오늘의길' 버튼. 어떤 팝업/화면에서도 유지되며,
 * 클릭하면 처음 화면으로 돌아간다. 검정 팝업 위에서는 색이 반전된다.
 */
export default function BrandButton({
  inverted,
  onClick,
}: {
  inverted: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="brand-pill"
      aria-label="처음 화면으로 돌아가기"
      onClick={onClick}
      initial={false}
      animate={{
        backgroundColor: inverted ? "#ffffff" : "#101010",
        color: inverted ? "#101010" : "#ffffff",
      }}
      whileTap={{ scale: 0.94 }}
      transition={softSpring}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="/assets/icon.png"
        alt=""
        className="brand-icon"
        draggable={false}
        initial={false}
        animate={{ filter: inverted ? "invert(1)" : "invert(0)" }}
        transition={{ duration: 0.25 }}
      />
      <span className="brand-label">오늘의길</span>
    </motion.button>
  );
}
