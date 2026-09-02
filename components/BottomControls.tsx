"use client";

export default function BottomControls({ onLocate }: { onLocate: () => void }) {
  return (
    <div className="bottom-controls">
      <button type="button" className="recommend-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5c.5 3.9 2 6.6 5.5 7.5-3.5.9-5 3.6-5.5 7.5-.5-3.9-2-6.6-5.5-7.5 3.5-.9 5-3.6 5.5-7.5z" />
          <path d="M19 13.5c.3 2.1 1.1 3.5 3 4-1.9.5-2.7 1.9-3 4-.3-2.1-1.1-3.5-3-4 1.9-.5 2.7-1.9 3-4z" />
        </svg>
        코스 추천받기
      </button>
      <button
        type="button"
        className="locate-button"
        aria-label="현재 위치로 이동"
        onClick={onLocate}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path
            d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
