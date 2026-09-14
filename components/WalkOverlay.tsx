import { formatWalkTime } from "@/lib/walk";
import LocateButton from "./LocateButton";

export default function WalkOverlay({ seconds, distance, remaining, onLocate, spotCount, onStories }: {
  seconds: number;
  distance: number;
  remaining: number;
  onLocate: () => void;
  spotCount: number;
  onStories: () => void;
}) {
  return <>
    <button type="button" className="walk-stories" aria-haspopup="dialog" onClick={onStories}><span aria-hidden="true">✧</span> 이 길의 이야기 <strong>{spotCount}</strong></button>
    <LocateButton className="walk-locate" onClick={onLocate} />
    <dl className="walk-metrics" aria-label="산책 기록">
      <div><dt>산책 시간</dt><dd>{formatWalkTime(seconds)}</dd></div>
      <div><dt>걸은 거리</dt><dd>{distance.toFixed(2)}<small>km</small></dd></div>
      <div><dt>남은 거리</dt><dd>{remaining.toFixed(2)}<small>km</small></dd></div>
    </dl>
  </>;
}
