"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Segmented from "./Segmented";
import Toggle from "./Toggle";
import { staggerItem } from "@/lib/motion";
import type { MapStyle } from "@/lib/types";

type Pace = "slow" | "normal" | "fast";
type Unit = "km" | "mi";

export default function SettingsPanel({
  mapStyle,
  onMapStyleChange,
}: {
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
}) {
  const [pace, setPace] = useState<Pace>("normal");
  const [unit, setUnit] = useState<Unit>("km");
  const [useLocation, setUseLocation] = useState(true);
  const [haptics, setHaptics] = useState(true);

  return (
    <div className="sp">
      <motion.div className="sp-profile" {...staggerItem(0)}>
        <span className="sp-avatar" aria-hidden>
          🌿
        </span>
        <span className="np-text">
          <span className="sp-name">산책러</span>
          <span className="np-desc">이번 주 12.4km · 4번 걸었어요</span>
        </span>
        <span className="sp-badge">Lv.3</span>
      </motion.div>

      <motion.div className="sp-row" {...staggerItem(1)}>
        <span className="sp-label">지도 스타일</span>
        <Segmented<MapStyle>
          name="map-style"
          value={mapStyle}
          onChange={onMapStyleChange}
          options={[
            { value: "light", label: "라이트" },
            { value: "mono", label: "모노" },
            { value: "dark", label: "다크" },
          ]}
        />
      </motion.div>

      <motion.div className="sp-row" {...staggerItem(2)}>
        <span className="sp-label">걷기 속도</span>
        <Segmented<Pace>
          name="pace"
          value={pace}
          onChange={setPace}
          options={[
            { value: "slow", label: "느긋하게" },
            { value: "normal", label: "보통" },
            { value: "fast", label: "빠르게" },
          ]}
        />
      </motion.div>

      <motion.div className="sp-row" {...staggerItem(3)}>
        <span className="sp-label">거리 단위</span>
        <Segmented<Unit>
          name="unit"
          value={unit}
          onChange={setUnit}
          options={[
            { value: "km", label: "km" },
            { value: "mi", label: "mi" },
          ]}
        />
      </motion.div>

      <motion.div className="np-row sp-toggle-row" {...staggerItem(4)}>
        <span className="np-emoji" aria-hidden>
          📍
        </span>
        <span className="np-text">
          <span className="np-title">위치 정보 사용</span>
          <span className="np-desc">현재 위치와 근처 코스 추천에 사용해요</span>
        </span>
        <Toggle on={useLocation} onChange={setUseLocation} label="위치 정보 사용" />
      </motion.div>

      <motion.div className="np-row sp-toggle-row" {...staggerItem(5)}>
        <span className="np-emoji" aria-hidden>
          📳
        </span>
        <span className="np-text">
          <span className="np-title">햅틱 피드백</span>
          <span className="np-desc">버튼을 누를 때 살짝 진동해요</span>
        </span>
        <Toggle on={haptics} onChange={setHaptics} label="햅틱 피드백" />
      </motion.div>

      <motion.p className="sp-footer" {...staggerItem(6)}>
        오늘의길 v0.1.0 · 이용약관 · 개인정보 처리방침
      </motion.p>
    </div>
  );
}
