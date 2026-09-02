"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Toggle from "./Toggle";
import { staggerItem } from "@/lib/motion";

interface NotificationSetting {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  on: boolean;
}

const INITIAL: NotificationSetting[] = [
  {
    id: "daily",
    emoji: "🌿",
    title: "오늘의 산책 추천",
    desc: "매일 아침 8시, 오늘 걷기 좋은 코스를 골라드려요",
    on: true,
  },
  {
    id: "weather",
    emoji: "🌤️",
    title: "걷기 좋은 날씨",
    desc: "바람 선선하고 미세먼지 좋은 날 살짝 알려드려요",
    on: true,
  },
  {
    id: "arrive",
    emoji: "📍",
    title: "코스 시작점 도착",
    desc: "시작 지점 100m 안에 들어오면 알려드려요",
    on: false,
  },
  {
    id: "weekly",
    emoji: "📊",
    title: "주간 걸음 리포트",
    desc: "매주 일요일 저녁, 한 주의 산책을 정리해드려요",
    on: true,
  },
];

export default function NotificationsPanel() {
  const [settings, setSettings] = useState(INITIAL);
  const [quietHours, setQuietHours] = useState(true);

  const toggle = (id: string, on: boolean) =>
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, on } : s)));

  const activeCount = settings.filter((s) => s.on).length;

  return (
    <div className="np">
      <motion.div className="np-hero" {...staggerItem(0)}>
        <span className="np-live">
          <motion.i
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          지금
        </span>
        <strong className="np-hero-title">오늘 오후 4시, 산책하기 딱 좋아요</strong>
        <span className="np-hero-meta">18°C · 미세먼지 좋음 · 바람 약함</span>
      </motion.div>

      <div className="np-section-label">
        <span>알림 받기</span>
        <span className="np-count">{activeCount}개 켜짐</span>
      </div>

      <ul className="np-list">
        {settings.map((item, i) => (
          <motion.li key={item.id} className="np-row" {...staggerItem(i + 1)}>
            <span className="np-emoji" aria-hidden>
              {item.emoji}
            </span>
            <span className="np-text">
              <span className="np-title">{item.title}</span>
              <span className="np-desc">{item.desc}</span>
            </span>
            <Toggle
              on={item.on}
              onChange={(on) => toggle(item.id, on)}
              label={item.title}
            />
          </motion.li>
        ))}
      </ul>

      <motion.div className="np-quiet" {...staggerItem(settings.length + 1)}>
        <span className="np-emoji" aria-hidden>
          🌙
        </span>
        <span className="np-text">
          <span className="np-title">방해 금지</span>
          <span className="np-desc">22:00 – 07:00에는 조용히 있을게요</span>
        </span>
        <Toggle on={quietHours} onChange={setQuietHours} label="방해 금지" />
      </motion.div>
    </div>
  );
}
