"use client";

import type { SpotPlace, SpotStory } from "@/lib/spots";
import { Dialog } from "./JournalUI";
import UiIcon from "./UiIcon";

const categoryLabel = { building: "건물 이야기", change: "장소의 변화", history: "동네 이야기", culture: "문화 이야기" };
const claimLabel = { fact: "자료로 읽는 이야기", folklore: "전해지는 이야기", statistic: "과거 지역 통계", event: "예정된 행사" };

/** Reference content detail for the development-only POI catalog. */
export function SpotDetail({ story, place, onClose, preview = false }: { story: SpotStory; place: SpotPlace; onClose: () => void; preview?: boolean }) {
  return <Dialog title={story.title} onClose={onClose} className="spot-detail">
    <button type="button" className="journal-icon spot-close" aria-label="이야기 닫기" onClick={onClose}><UiIcon name="close" /></button>
    <div className="spot-detail-scroll">
      <p className="spot-place"><UiIcon name="pin" />{place.name}</p>
      <span className="spot-kind">{categoryLabel[story.category]} · {claimLabel[story.claimKind]}</span>
      {preview && <p className="spot-review-note">개발 전용 콘텐츠 미리보기 · {place.location.status === "verified" ? "위치 확인 · 코스 연결 없음" : "위치 미검증 · 지도에 표시하지 않아요"}</p>}
      <p className="spot-summary">{story.summary}</p>
      <p className="spot-detail-copy">{story.detail}</p>
      {story.observation && <aside className="spot-observation"><span aria-hidden="true">✧</span><p>{story.observation}</p></aside>}
      <p className="spot-optional">{preview ? "이야기와 출처를 검토하는 화면이에요." : "경로 주변에서 읽는 이야기예요. 꼭 들르지 않아도 괜찮아요."}</p>
      <details className="spot-sources"><summary>출처와 장소 정보</summary>
        {place.address && <p className="spot-address">{place.address}</p>}
        {story.evidence.map((source, index) => <div className="spot-evidence" key={`${source.sourceId}-${index}`}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} ↗<span className="sr-only"> (새 창)</span></a>
          <dl><div><dt>확인일</dt><dd>{source.checkedOn}</dd></div><div><dt>자료 기준</dt><dd>{source.asOf}</dd></div></dl>
          {source.limitations.map(text => <p key={text}>{text}</p>)}
        </div>)}
        <div className="spot-evidence"><strong>위치 확인</strong><p>{place.location.method}</p>
          {place.location.evidence.map((source, index) => <p key={index}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} ↗<span className="sr-only"> (새 창)</span></a> · {source.checkedOn}</p>)}
          {place.location.limitations.map(text => <p key={text}>{text}</p>)}
          {!preview && <p>지도에 그린 경로와의 직선 거리로 골랐어요. 실제 도보 접근성이나 진입 가능성을 확인한 것은 아니에요.</p>}
        </div>
      </details>
    </div>
    <button type="button" className="journal-primary spot-return" onClick={onClose}>이야기 닫기</button>
  </Dialog>;
}
