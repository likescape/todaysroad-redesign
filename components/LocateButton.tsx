export default function LocateButton({ className, onClick }: {
  className: string;
  onClick: () => void;
}) {
  return <button type="button" className={`icon-button ${className}`} aria-label="현재 위치로 이동" onClick={onClick}>
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="6.2" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22" />
    </svg>
  </button>;
}
