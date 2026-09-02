import type { Transition } from "motion/react";

/**
 * 다이나믹 아일랜드 느낌의 젤리처럼 꿈틀거리는 스프링 — 영역 확장/축소용.
 * bounce가 높아 목표 크기를 살짝 넘겼다가 되돌아오며 자리를 잡는다.
 */
export const islandSpring: Transition = {
  type: "spring",
  visualDuration: 0.42,
  bounce: 0.38,
};

/** 토글·세그먼트 등 작은 UI 이동용 */
export const softSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 36,
};

/**
 * 아일랜드가 열린 뒤 내용이 떠오르며 드러나는 모션.
 * (filter: blur는 애니메이션이 끝난 뒤에도 텍스트를 흐리게 래스터화하므로 쓰지 않는다)
 */
export const contentReveal = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.12, ease: "easeOut" } as Transition,
  },
  transition: {
    delay: 0.14,
    duration: 0.32,
    ease: [0.2, 0.8, 0.2, 1],
  } as Transition,
};

/** 리스트 항목 순차 등장 */
export const staggerItem = (index: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: {
    delay: 0.22 + index * 0.05,
    duration: 0.3,
    ease: [0.2, 0.8, 0.2, 1],
  } as Transition,
});
