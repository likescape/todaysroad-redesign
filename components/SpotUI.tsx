"use client";

import type { ResolvedSpot, SpotPlace, SpotStory } from "@/lib/spots";
import { Dialog } from "./JournalUI";
import UiIcon from "./UiIcon";

const categoryLabel = { building: "건물 이야기", change: "장소의 변화", history: "동네 이야기", culture: "문화 이야기" };
const claimLabel = { fact: "자료로 읽는 이야기", folklore: "전해지는 이야기", statistic: "과거 지역 통계", event: "예정된 행사" };

export function SpotList({ spots, selectedId, onSelect }: { spots: ResolvedSpot[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!spots.length) return <p className="spot-empty">아직 이 경로 주변에서 소개할 이야기를 찾지 못했어요. 오늘의 풍경을 천천히 만나보세요.</p>;
  return <ul className="spot-list">{spots.map(({ story, place, link }) => <li key={story.id}>
    <button type="button" className="spot-row" data-spot-id={story.id} aria-pressed={selectedId === story.id} aria-haspopup="dialog" onClick={() => onSelect(story.id)}>
      <span className="spot-number" aria-hidden="true">{link.order}</span>
      <span className="spot-row-copy"><strong>{story.title}</strong><small>{place.name}</small></span>
      <UiIcon name="chevron" />
    </button>
  </li>)}</ul>;
}

export function CourseStories({ onShowAll, ...props }: Parameters<typeof SpotList>[0] & { onShowAll: () => void }) {
  return <section className="course-stories" aria-label="이 길에서 발견할 이야기">
    <div className="spot-section-heading"><h3>이 길에서 발견할 이야기</h3>{props.spots.length > 0 ? <button type="button" onClick={onShowAll} aria-haspopup="dialog" aria-label={`경로 주변 이야기 ${props.spots.length}개 모두 보기`}>{props.spots.length}개 모두 보기</button> : <span>경로 주변 · 0</span>}</div>
    <SpotList {...props} />
  </section>;
}

/** Shared by the map, course card, walk list, and unlocated development catalog. */
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

export function WalkStories({ spots, onClose, onSelect, selectedId, walking }: Parameters<typeof SpotList>[0] & { onClose: () => void; walking: boolean }) {
  return <Dialog title="이 길에서 발견할 이야기" onClose={onClose} className="spot-walk-list">
    <p className="spot-list-intro">경로 주변의 작은 발견을 천천히 읽어 보세요.</p>
    <SpotList spots={spots} selectedId={selectedId} onSelect={onSelect} />
    <p className="spot-optional">{walking ? "이동은 시뮬레이션이에요. 도착이나 방문을 기록하지 않아요." : "꼭 들르지 않아도 괜찮아요. 마음에 드는 이야기를 골라 읽어 보세요."}</p>
    <button type="button" className="journal-secondary" onClick={onClose}>{walking ? "산책으로 돌아가기" : "코스로 돌아가기"}</button>
  </Dialog>;
}
