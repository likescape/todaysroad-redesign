import type { Transition } from "motion/react";

/** 다이나믹 아일랜드 느낌의 살짝 튕기는 스프링 — 영역 확장/축소용 */
export const islandSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/**
 * 패널 크기 변화(layout)용 스프링. 감쇠를 충분히 줘 목표를 아주 살짝만 넘겼다 정착한다.
 */
export const islandLayoutSpring: Transition = {
  type: "spring",
  stiffness: 330,
  damping: 31,
  mass: 1,
};

/**
 * 커지는 동안 형태가 은근히 부풀었다 정착하는 유기적 변형 (절제된 Blob + Squish).
 * 시작값은 원래 형태(반경 30, 스케일 1)라 열리는 순간 튀지 않고,
 * 모서리는 최대 +16px, 스케일은 ±1.5% 안에서만 움직인다.
 */
const R = 30;
export const islandBlob = {
  enter: {
    scaleX: [1, 1.015, 0.996, 1],
    scaleY: [1, 0.986, 1.006, 1],
    borderTopLeftRadius: [R, 46, 27, R],
    borderTopRightRadius: [R, 34, 42, R],
    borderBottomRightRadius: [R, 44, 28, R],
    borderBottomLeftRadius: [R, 36, 40, R],
  },
  exit: {
    scaleX: [1, 0.99, 1],
    scaleY: [1, 1.008, 1],
    borderTopLeftRadius: [R, 38, R],
    borderTopRightRadius: [R, 34, R],
    borderBottomRightRadius: [R, 40, R],
    borderBottomLeftRadius: [R, 34, R],
  },
  enterTransition: {
    duration: 0.75,
    times: [0, 0.4, 0.72, 1],
    ease: "easeInOut",
  } as Transition,
  exitTransition: {
    duration: 0.32,
    times: [0, 0.5, 1],
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
    delay: 0.2,
    duration: 0.34,
    ease: [0.2, 0.8, 0.2, 1],
  } as Transition,
};

/** 리스트 항목 순차 등장 */
export const staggerItem = (index: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: {
    delay: 0.28 + index * 0.05,
    duration: 0.3,
    ease: [0.2, 0.8, 0.2, 1],
  } as Transition,
});
