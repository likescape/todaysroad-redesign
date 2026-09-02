import type { Transition } from "motion/react";

/** 다이나믹 아일랜드 느낌의 살짝 튕기는 스프링 — 영역 확장/축소용 */
export const islandSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/**
 * 버블처럼 형태가 꿈틀거리는 변형. 레이아웃 모핑(크기 변화)과 동시에 재생되며
 * 네 모서리 반경이 서로 다르게 출렁이고, 가로/세로가 번갈아 눌렸다 늘어난다.
 * 최종 값은 모두 원래 형태(반경 30, 스케일 1)로 수렴한다.
 */
const R = 30;
export const islandWobble = {
  enter: {
    scaleX: [1, 1.045, 0.97, 1.015, 0.995, 1],
    scaleY: [1, 0.955, 1.035, 0.985, 1.005, 1],
    borderTopLeftRadius: [R, 52, 22, 40, 27, R],
    borderTopRightRadius: [R, 20, 50, 26, 34, R],
    borderBottomRightRadius: [R, 54, 24, 38, 28, R],
    borderBottomLeftRadius: [R, 24, 48, 28, 33, R],
  },
  exit: {
    scaleX: [1, 0.965, 1.03, 0.99, 1],
    scaleY: [1, 1.04, 0.97, 1.01, 1],
    borderTopLeftRadius: [R, 22, 46, 28, R],
    borderTopRightRadius: [R, 48, 24, 34, R],
    borderBottomRightRadius: [R, 24, 44, 28, R],
    borderBottomLeftRadius: [R, 46, 22, 32, R],
  },
  enterTransition: {
    duration: 0.85,
    times: [0, 0.18, 0.4, 0.62, 0.82, 1],
    ease: "easeInOut",
  } as Transition,
  exitTransition: {
    duration: 0.45,
    times: [0, 0.3, 0.6, 0.85, 1],
    ease: "easeInOut",
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
