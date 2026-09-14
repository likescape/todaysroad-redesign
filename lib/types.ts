export type Panel = "notifications" | "settings" | "recommend" | null;

export type MapStyle = "light" | "mono" | "dark";

export interface RecommendPrefs {
  minutes: 15 | 30 | 60 | 90;
  tags: string[];
}
