import { formatWalkTime } from "@/lib/walk";
import LocateButton from "./LocateButton";

export default function WalkOverlay({ seconds, distance, remaining, onLocate }: {
  seconds: number;
  distance: number;
  remaining: number;
  onLocate: () => void;
}) {
  return <>
    <LocateButton className="walk-locate" onClick={onLocate} />
    <dl className="walk-metrics" aria-label="산책 기록">
      <div><dt>산책 시간</dt><dd>{formatWalkTime(seconds)}</dd></div>
      <div><dt>걸은 거리</dt><dd>{distance.toFixed(2)}<small>km</small></dd></div>
      <div><dt>남은 거리</dt><dd>{remaining.toFixed(2)}<small>km</small></dd></div>
    </dl>
  </>;
}
