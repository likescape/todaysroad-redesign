"use client";

import { motion } from "motion/react";
import { islandSpring } from "@/lib/motion";
import UiIcon from "./UiIcon";
import type { Panel } from "@/lib/types";

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3a6 6 0 0 0-6 6v3.2c0 .5-.2 1-.5 1.4l-1.2 1.6c-.5.7 0 1.8.9 1.8h13.6c.9 0 1.4-1.1.9-1.8l-1.2-1.6c-.3-.4-.5-.9-.5-1.4V9a6 6 0 0 0-6-6z"
        fill="currentColor"
      />
      <path
        d="M9.8 19a2.3 2.3 0 0 0 4.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 우상단 알림/설정 버튼. 클릭된 버튼은 언마운트되고 같은 layoutId를 가진
 * IslandPanel이 그 자리에서 확장된다(다이나믹 아일랜드 모핑).
 */
export default function TopActions({
  panel,
  onOpen,
}: {
  panel: Panel;
  onOpen: (panel: Exclude<Panel, null>) => void;
}) {
  // 어떤 패널이든 열리면 상단 버튼은 숨긴다 (닫기 버튼이 그 자리를 차지)
  const dimmed = panel !== null;

  return (
    <div className="top-actions">
      {panel !== "notifications" && (
        <motion.button
          type="button"
          layoutId="island-notifications"
          className="icon-button"
          aria-label="알림"
          style={{ borderRadius: 23, pointerEvents: dimmed ? "none" : "auto" }}
          animate={{ opacity: dimmed ? 0 : 1, scale: dimmed ? 0.8 : 1 }}
          whileTap={{ scale: 0.9 }}
          transition={islandSpring}
          onClick={() => onOpen("notifications")}
        >
          <BellIcon />
        </motion.button>
      )}
      {panel !== "settings" && (
        <motion.button
          type="button"
          layoutId="island-settings"
          className="icon-button"
          aria-label="설정"
          style={{ borderRadius: 23, pointerEvents: dimmed ? "none" : "auto" }}
          animate={{ opacity: dimmed ? 0 : 1, scale: dimmed ? 0.8 : 1 }}
          whileTap={{ scale: 0.9 }}
          transition={islandSpring}
          onClick={() => onOpen("settings")}
        >
          <UiIcon name="gear" />
        </motion.button>
      )}
    </div>
  );
}
