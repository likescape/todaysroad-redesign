import type { Transition } from "motion/react";

/** 다이나믹 아일랜드 느낌의 살짝 튕기는 스프링 — 영역 확장/축소용 */
export const islandSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/**
 * 패널 크기 변화(layout)용 스프링. 목표 크기를 살짝 넘겼다가 돌아오는 Overshoot.
 */
export const islandLayoutSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
  mass: 0.9,
};

/**
 * 뭉게뭉게 부풀며 커지는 Blob + Squish 변형. 레이아웃 모핑과 동시에 재생된다.
 * - Blob: 네 모서리 반경이 서로 다르게 크게 부풀었다가 박스(반경 30)로 정착
 * - Squish: 가로/세로가 번갈아 눌렸다 늘어남 (젤리)
 * 최종 값은 모두 원래 형태로 수렴한다.
 */
const R = 30;
export const islandBlob = {
  enter: {
    scaleX: [0.94, 1.06, 0.975, 1.012, 1],
    scaleY: [0.9, 1.05, 0.97, 1.01, 1],
    borderTopLeftRadius: [R, 120, 44, 62, R],
    borderTopRightRadius: [R, 70, 130, 40, R],
    borderBottomRightRadius: [R, 130, 50, 58, R],
    borderBottomLeftRadius: [R, 60, 118, 42, R],
  },
  exit: {
    scaleX: [1, 1.03, 0.96, 1],
    scaleY: [1, 0.96, 1.04, 1],
    borderTopLeftRadius: [R, 90, 46, R],
    borderTopRightRadius: [R, 48, 96, R],
    borderBottomRightRadius: [R, 96, 44, R],
    borderBottomLeftRadius: [R, 52, 88, R],
  },
  enterTransition: {
    duration: 0.95,
    times: [0, 0.28, 0.55, 0.8, 1],
    ease: [0.22, 1, 0.36, 1],
  } as Transition,
  exitTransition: {
    duration: 0.42,
    times: [0, 0.35, 0.7, 1],
    ease: [0.22, 1, 0.36, 1],
  } as Transition,
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
