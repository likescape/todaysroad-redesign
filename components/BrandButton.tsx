"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";

/**
 * 좌상단 '오늘의길' 버튼. 어떤 팝업/화면에서도 유지되며,
 * 클릭하면 처음 화면으로 돌아간다. 검정 팝업 위에서도 검정 배경/흰 글씨를 유지하고,
 * 팝업과 구분되도록 얇은 흰 테두리만 살짝 드러난다.
 */
export default function BrandButton({
  onPanel,
  onClick,
}: {
  onPanel: boolean;
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
        boxShadow: onPanel
          ? "0 0 0 1.5px rgba(255,255,255,0.28), 0 6px 18px rgba(16,16,16,0)"
          : "0 0 0 0px rgba(255,255,255,0), 0 6px 18px rgba(16,16,16,0.18)",
      }}
      whileTap={{ scale: 0.94 }}
      transition={softSpring}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/icon.png"
        alt=""
        className="brand-icon"
        draggable={false}
      />
      <span className="brand-label">오늘의길</span>
    </motion.button>
  );
}
