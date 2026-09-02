"use client";

export default function TopBar() {
  return (
    <header className="top-bar">
      <div className="brand-pill">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/icon.png" alt="오늘의길 아이콘" className="brand-icon" />
        <span className="brand-label">오늘의길</span>
      </div>
      <div className="top-actions">
        <button type="button" className="icon-button" aria-label="알림">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3a6 6 0 0 0-6 6v3.2c0 .5-.2 1-.5 1.4l-1.2 1.6c-.5.7 0 1.8.9 1.8h13.6c.9 0 1.4-1.1.9-1.8l-1.2-1.6c-.3-.4-.5-.9-.5-1.4V9a6 6 0 0 0-6-6z"
              fill="currentColor"
            />
            <path
              d="M9.8 19a2.3 2.3 0 0 0 4.4 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button type="button" className="icon-button" aria-label="설정">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm9.2 4.9.1-1.5-.1-1.5-2.2-.6a7.3 7.3 0 0 0-.7-1.6l1.2-2-2.1-2.1-2 1.2a7.3 7.3 0 0 0-1.6-.7L13.5 2.5h-3L9.9 4.7a7.3 7.3 0 0 0-1.6.7l-2-1.2-2.1 2.1 1.2 2a7.3 7.3 0 0 0-.7 1.6l-2.2.6-.1 1.5.1 1.5 2.2.6c.2.6.4 1.1.7 1.6l-1.2 2 2.1 2.1 2-1.2c.5.3 1 .5 1.6.7l.6 2.2h3l.6-2.2a7.3 7.3 0 0 0 1.6-.7l2 1.2 2.1-2.1-1.2-2c.3-.5.5-1 .7-1.6l2.2-.6z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
