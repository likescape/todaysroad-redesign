"use client";

import { motion } from "motion/react";
import { islandSpring } from "@/lib/motion";
import type { Panel } from "@/lib/types";

export default function BottomControls({
  panel,
  onLocate,
}: {
  panel: Panel;
  onLocate: () => void;
}) {
  const recommendOpen = panel === "recommend";

  return (
    <div className="bottom-controls">
      <motion.button
        type="button"
        className="locate-button"
        aria-label="현재 위치로 이동"
        onClick={onLocate}
        animate={{
          opacity: recommendOpen ? 0 : 1,
          scale: recommendOpen ? 0.7 : 1,
        }}
        whileTap={{ scale: 0.9 }}
        transition={islandSpring}
        style={{ pointerEvents: recommendOpen ? "none" : "auto" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path
            d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>
    </div>
  );
}
