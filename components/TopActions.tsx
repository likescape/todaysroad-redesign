"use client";

import { motion } from "motion/react";
import UiIcon from "./UiIcon";

/** 지도 중심 탐색: 보조 화면 진입은 상단의 작은 라벨 버튼으로 모은다. */
export default function TopActions({
  hidden,
  onCommunity,
  onMyWalk,
}: {
  hidden: boolean;
  onCommunity: () => void;
  onMyWalk: () => void;
}) {
  return (
    <nav className="top-destinations" aria-label="주 메뉴" inert={hidden}>
      <motion.button
        type="button"
        className="destination-button"
        onClick={onCommunity}
        animate={{ opacity: hidden ? 0 : 1, scale: hidden ? 0.9 : 1 }}
        whileTap={{ scale: 0.94 }}
      >
        <UiIcon name="people" /><span>커뮤니티</span>
      </motion.button>
      <motion.button
        type="button"
        className="destination-button"
        onClick={onMyWalk}
        animate={{ opacity: hidden ? 0 : 1, scale: hidden ? 0.9 : 1 }}
        whileTap={{ scale: 0.94 }}
      >
        <UiIcon name="person" /><span>내 산책</span>
      </motion.button>
    </nav>
  );
}
