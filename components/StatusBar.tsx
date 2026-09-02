"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function StatusBar() {
  const [time, setTime] = useState("9:41");

  useEffect(() => {
    const update = () => setTime(formatTime(new Date()));
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar">
      <span className="status-time">{time}</span>
      <span className="status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <path d="M8.5 9.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z" />
          <path d="M8.5 5.6c1.7 0 3.3.7 4.5 1.8l-1.5 1.6a4.4 4.4 0 0 0-6 0L4 7.4a6.5 6.5 0 0 1 4.5-1.8z" />
          <path d="M8.5 1.2c2.9 0 5.6 1.1 7.6 3l-1.5 1.6a8.8 8.8 0 0 0-12.2 0L.9 4.2c2-1.9 4.7-3 7.6-3z" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3.5"
            stroke="currentColor"
            opacity="0.4"
          />
          <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
          <path
            d="M23 4v4c1-.3 1.7-1 1.7-2S24 4.3 23 4z"
            fill="currentColor"
            opacity="0.4"
          />
        </svg>
      </span>
    </div>
  );
}
