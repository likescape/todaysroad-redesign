"use client";

import { useState } from "react";
import { SPOT_CATALOG } from "@/lib/spot-content";
import { SpotDetail } from "./SpotUI";

export default function SpotCatalogPreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const story = SPOT_CATALOG.stories.find(item => item.id === selectedId);
  const place = SPOT_CATALOG.places.find(item => item.id === story?.placeId);
  return <div id="todaysroad-app" className="app spot-catalog">
    <section className="spot-catalog-content">
      <span className="spot-kind">개발 전용 · 지도 연결 없는 콘텐츠 검토</span>
      <h1>장소를 새롭게 보는 이야기</h1>
      <p>위치 미검증 콘텐츠는 실제 코스에 노출되지 않아요. 아래에서 이야기와 근거만 검토할 수 있어요.</p>
      <a href="/?preview=spots">위치 확인된 스팟의 가상 경로 미리보기 ↗</a>
      <ul className="spot-list">{SPOT_CATALOG.stories.map(story => {
        const place = SPOT_CATALOG.places.find(item => item.id === story.placeId)!;
        return <li key={story.id}><button type="button" className="spot-row" onClick={() => setSelectedId(story.id)} aria-haspopup="dialog"><span className="spot-row-copy"><strong>{story.title}</strong><small>{place.name} · {place.location.status === "verified" ? "위치 확인 · 코스 연결 없음" : "위치 미검증"}</small></span></button></li>;
      })}</ul>
      <a href="/">홈으로 돌아가기</a>
    </section>
    {story && place && <SpotDetail story={story} place={place} preview onClose={() => setSelectedId(null)} />}
  </div>;
}
