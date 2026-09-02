"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";

export default function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle${on ? " is-on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <motion.span className="toggle-knob" layout transition={softSpring} />
    </button>
  );
}
