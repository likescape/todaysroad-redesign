"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

/** 선택된 항목 뒤로 흰색 썸이 스프링으로 미끄러지는 세그먼트 컨트롤 */
export default function Segmented<T extends string | number>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented-item${active ? " is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {active && (
              <motion.span
                layoutId={`segmented-thumb-${name}`}
                className="segmented-thumb"
                transition={softSpring}
              />
            )}
            <span className="segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
