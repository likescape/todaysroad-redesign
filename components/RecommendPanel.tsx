"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Segmented from "./Segmented";
import { softSpring, staggerItem } from "@/lib/motion";
import type { RecommendPrefs } from "@/lib/types";

const TIMES: RecommendPrefs["minutes"][] = [15, 30, 60, 120];

const TAGS = [
  { id: "nature", emoji: "🌿", label: "자연적인" },
  { id: "urban", emoji: "🏙️", label: "도시적인" },
  { id: "quiet", emoji: "🤫", label: "조용한" },
  { id: "lively", emoji: "🎉", label: "활기찬" },
  { id: "river", emoji: "🌊", label: "강변" },
  { id: "alley", emoji: "🏘️", label: "골목길" },
  { id: "night", emoji: "🌙", label: "야경" },
  { id: "cafe", emoji: "☕", label: "카페 투어" },
  { id: "hill", emoji: "⛰️", label: "언덕" },
  { id: "flat", emoji: "🚶", label: "평지" },
];

export default function RecommendPanel({
  onSubmit,
}: {
  onSubmit: (prefs: RecommendPrefs) => void;
}) {
  const [minutes, setMinutes] = useState<RecommendPrefs["minutes"]>(30);
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (id: string) =>
    setTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const canSubmit = tags.length > 0;
  const summary = canSubmit
    ? `${minutes}분 · ${tags
        .map((id) => TAGS.find((t) => t.id === id)?.label)
        .join(", ")}`
    : "분위기를 1개 이상 골라주세요";

  return (
    <div className="rp">
      <motion.p className="rp-lead" {...staggerItem(0)}>
        오늘은 어떤 산책을 할까요?
      </motion.p>

      <motion.div className="sp-row" {...staggerItem(1)}>
        <span className="sp-label">희망 시간</span>
        <Segmented<RecommendPrefs["minutes"]>
          name="minutes"
          value={minutes}
          onChange={setMinutes}
          options={TIMES.map((m) => ({ value: m, label: `${m}분` }))}
        />
      </motion.div>

      <motion.div className="sp-row" {...staggerItem(2)}>
        <span className="sp-label">
          분위기 <span className="rp-hint">1개 이상</span>
        </span>
        <div className="rp-tags">
          {TAGS.map((tag, i) => {
            const active = tags.includes(tag.id);
            return (
              // 바깥 래퍼가 등장 스태거만 담당하고, 버튼 자체는 지연 없이 즉시 반응한다
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...softSpring, delay: 0.24 + i * 0.03 }}
              >
                <motion.button
                  type="button"
                  className={`rp-tag${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleTag(tag.id)}
                  initial={false}
                  animate={{
                    scale: active ? 1.04 : 1,
                    backgroundColor: active ? "#ffffff" : "rgba(255,255,255,0.1)",
                    color: active ? "#101010" : "#ffffff",
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={softSpring}
                >
                  <span aria-hidden>{tag.emoji}</span>
                  {tag.label}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="rp-footer" {...staggerItem(3)}>
        <span className="rp-summary">{summary}</span>
        <motion.button
          type="button"
          className="rp-submit"
          disabled={!canSubmit}
          onClick={() => canSubmit && onSubmit({ minutes, tags })}
          animate={{ opacity: canSubmit ? 1 : 0.4 }}
          whileTap={canSubmit ? { scale: 0.96 } : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.5 3.9 2 6.6 5.5 7.5-3.5.9-5 3.6-5.5 7.5-.5-3.9-2-6.6-5.5-7.5 3.5-.9 5-3.6 5.5-7.5z" />
            <path d="M19 13.5c.3 2.1 1.1 3.5 3 4-1.9.5-2.7 1.9-3 4-.3-2.1-1.1-3.5-3-4 1.9-.5 2.7-1.9 3-4z" />
          </svg>
          추천 받기
        </motion.button>
      </motion.div>
    </div>
  );
}
