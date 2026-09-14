"use client";

import { useId } from "react";
import { attachCourse, formatDate, formatDuration, formatPace, type CourseAttachment, type WalkRecord } from "@/lib/journal";
import { RoutePreview, ScreenHeader } from "./JournalUI";
import UiIcon from "./UiIcon";

export function WalkSummary({ record }: { record: Pick<WalkRecord, "distance" | "seconds"> }) {
  return <dl className="record-metrics"><div><dt>걸은 거리</dt><dd>{record.distance.toFixed(2)}<small>km</small></dd></div><div><dt>산책 시간</dt><dd className="duration-value">{formatDuration(record.seconds)}</dd></div><div><dt>평균 페이스</dt><dd>{formatPace(record)}<small>/km</small></dd></div></dl>;
}

function CourseWalkAction({ path, walking, label, onStart }: {
  path: CourseAttachment["path"]; walking: boolean; label: string; onStart: () => void;
}) {
  const hintId = useId();
  const unavailable = walking ? "진행 중인 산책을 마친 뒤 시작할 수 있어요." : path.length < 2 ? "다시 걸을 수 있는 경로가 없는 기록이에요." : "";
  return <>
    <button type="button" className="journal-primary" onClick={onStart} disabled={!!unavailable} aria-describedby={unavailable ? hintId : undefined}><UiIcon name="walk" />{label}</button>
    {unavailable && <p id={hintId} className="course-walk-hint">{unavailable}</p>}
  </>;
}

export default function WalkRecordScreen({ record, completed = false, onBack, onWrite, onWalk, walking }: {
  record: WalkRecord; completed?: boolean; onBack: () => void;
  onWrite: (record: WalkRecord) => void;
  onWalk: (course: CourseAttachment) => void; walking: boolean;
}) {
  const time = (value: string) => new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  return <section className="page-surface journal-page record-page">
    <div className="journal-layout">
      <ScreenHeader title={completed ? "산책 완료" : "산책 기록"} onBack={onBack} />
      <div className="journal-scroll">
        {completed && <div className="completion-heading"><span className="completion-mark"><UiIcon name="check" /></span><span className="eyebrow">오늘의 한 걸음이 쌓였어요</span><h2>오늘도 잘 걸었어요!</h2><p>걸은 길과 시간은 내 산책에 저장했어요.</p></div>}
        <div className="record-heading"><span className="eyebrow">{formatDate(record.startedAt)}의 산책</span><h2>{record.title}</h2>{!completed && <span className="subtle-badge"><UiIcon name="check" /> 산책 완료</span>}</div>
        <div className="record-route-card"><RoutePreview path={record.path} color={record.color} /><WalkSummary record={record} /><div className="record-time"><UiIcon name="clock" /><span>{formatDate(record.startedAt)} · {time(record.startedAt)} — {time(record.endedAt)}</span></div></div>
        <div className="record-story-hint"><span className="stat-icon"><UiIcon name="edit" /></span><span><strong>기억하고 싶은 순간이 있나요?</strong><small>이야기에 글과 사진을 남겨보세요.<br />나만 간직하거나 모두와 나눌 수 있어요.</small></span></div>
        {record.example && <p className="local-caption">디자인 확인용 예시 기록이에요.</p>}
      </div>
      <footer className="journal-footer">
        <div className="record-actions">
          {!completed && <CourseWalkAction path={record.path} walking={walking} label="이 코스 다시 걷기" onStart={() => onWalk(attachCourse(record))} />}
          <button type="button" className={completed ? "journal-primary" : "journal-secondary"} onClick={() => onWrite(record)}><UiIcon name="edit" /> 이 산책에 이야기 남기기</button>
        </div>
        {completed && <button type="button" className="record-return" onClick={onBack}>내 산책으로 돌아가기</button>}
        <p>공개 범위는 이야기 작성 화면에서 선택해요</p>
      </footer>
    </div>
  </section>;
}

export function SharedCourseScreen({ course, onBack, onWalk, walking }: {
  course: CourseAttachment; onBack: () => void; onWalk: (course: CourseAttachment) => void; walking: boolean;
}) {
  return <section className="page-surface journal-page">
    <ScreenHeader title="공유된 산책 코스" onBack={onBack} />
    <div className="journal-scroll"><div className="record-heading"><span className="eyebrow">함께 걸은 길</span><h2>{course.title}</h2></div><div className="record-route-card"><RoutePreview path={course.path} color={course.color} /><WalkSummary record={course} /></div><div className="course-explanation"><UiIcon name="route" /><p>이 산책에서 걸은 경로예요.<br />거리와 시간은 공유된 기록을 기준으로 표시해요.</p></div><p className="local-caption">{course.path.length ? `경로 좌표 ${course.path.length}개가 첨부되어 있어요.` : "첨부된 경로 좌표가 없어요."}</p></div>
    <footer className="journal-footer"><CourseWalkAction path={course.path} walking={walking} label="이 코스로 산책하기" onStart={() => onWalk(course)} /></footer>
  </section>;
}
