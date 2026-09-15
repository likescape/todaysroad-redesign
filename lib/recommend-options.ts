export interface MoodTag { id: string; emoji: string; label: string }

export const MOOD_TAGS: MoodTag[] = [
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
