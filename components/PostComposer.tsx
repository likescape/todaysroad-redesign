"use client";

import { useState } from "react";
import { CURRENT_USER, MAX_PHOTOS, attachCourse, createPostDraft, type CommunityPost, type PostDraft, type WalkRecord } from "@/lib/journal";
import { ConfirmDialog, CourseAttachmentCard, Dialog, EmptyState, ErrorMessage, PhotoPicker, ScreenHeader } from "./JournalUI";
import UiIcon from "./UiIcon";

export default function PostComposer({ records, record, post, onBack, onSave }: { records: WalkRecord[]; record?: WalkRecord; post?: CommunityPost; onBack: () => void; onSave: (draft: PostDraft) => void }) {
  const [initial] = useState(() => createPostDraft(record, post));
  const [draft, setDraft] = useState(initial);
  const [sourceId, setSourceId] = useState(record?.id ?? post?.course?.recordId);
  const [picker, setPicker] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const source = records.find(item => item.id === sourceId);
  const canEdit = !post || post.authorId === CURRENT_USER.id;
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const back = () => { if (dirty) setDiscard(true); else onBack(); };
  const publish = () => {
    if (!canEdit || busy) return;
    if (!draft.body.trim()) { setError("남기고 싶은 산책 이야기를 입력해 주세요."); return; }
    try { onSave(draft); }
    catch (err) { setError(err instanceof Error ? err.message : "글을 저장하지 못했어요."); }
  };
  return <section className="page-surface journal-page composer-page"><div className="journal-layout" inert={picker || discard}>
    <ScreenHeader title={post ? "이야기 수정" : "산책 이야기 쓰기"} onBack={back} />
    <div className="journal-scroll">
      <div className="composer-author"><span className="author-avatar own"><UiIcon name="person" /></span><span><strong>{CURRENT_USER.name}</strong><small>나만 간직하거나 모두와 나눠요</small></span></div>
      {!canEdit && <ErrorMessage message="내가 작성한 글만 수정할 수 있어요." />}
      <label className="composer-body"><span className="sr-only">산책 이야기</span><textarea value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} maxLength={2000} placeholder={"오늘은 어떤 길을 걸었나요?\n기억하고 싶은 풍경과 생각을 남겨보세요."} rows={7} /><span className="field-count">{draft.body.length}/2,000</span></label>
      <section className="composer-section"><div className="section-heading"><h2>사진 <small>선택</small></h2><span>{draft.photos.length}/{MAX_PHOTOS}</span></div><PhotoPicker photos={draft.photos} onChange={photos => setDraft(current => ({ ...current, photos }))} onBusy={setBusy} />
        {!!source?.photos.length && <div className="record-photo-select"><h3>이전에 기록한 사진 가져오기</h3><div>{source.photos.map(photo => {
          const selected = draft.photos.some(item => item.id === photo.id);
          return <button type="button" key={photo.id} disabled={busy} aria-label={`${photo.name} ${selected ? "선택 해제" : "선택"}`} aria-pressed={selected} onClick={() => {
            if (!selected && draft.photos.length >= MAX_PHOTOS) { setError("사진은 최대 5장까지 첨부할 수 있어요."); return; }
            setError(""); setDraft({ ...draft, photos: selected ? draft.photos.filter(item => item.id !== photo.id) : [...draft.photos, photo] });
          }}><img src={photo.src} alt={photo.name} /><span>{selected && <UiIcon name="check" />}</span></button>;
        })}</div></div>}
      </section>
      <section className="composer-section"><div className="section-heading"><h2>산책 코스 <small>선택</small></h2>{draft.course && <button type="button" className="header-text-button" onClick={() => setDraft({ ...draft, course: null })}>첨부 해제</button>}</div>{draft.course ? <><CourseAttachmentCard course={draft.course} /><button type="button" className="change-course" onClick={() => setPicker(true)}>다른 산책 기록 선택 <UiIcon name="chevron" /></button></> : <button type="button" className="attach-record-button" onClick={() => setPicker(true)}><span className="stat-icon"><UiIcon name="route" /></span><span><strong>내 산책에서 가져오기</strong><small>걸었던 경로와 거리, 시간을 첨부해요</small></span><UiIcon name="plus" /></button>}</section>
      <section className="composer-section visibility-section"><label htmlFor="post-visibility"><UiIcon name={draft.visibility === "public" ? "globe" : "lock"} /><span>공개 범위</span></label><select id="post-visibility" value={draft.visibility} onChange={event => setDraft({ ...draft, visibility: event.target.value as PostDraft["visibility"] })}><option value="public">전체 공개</option><option value="private">나만 보기</option></select><p>{draft.visibility === "public" ? draft.course ? "첨부한 사진과 코스의 출발·도착 위치가 함께 공개돼요." : "모두의 산책에서 사진과 이야기를 볼 수 있어요." : "내 이야기에서 나에게만 표시돼요."}</p></section>
    </div>
    <footer className="journal-footer">{error && <ErrorMessage message={error} />}<button type="button" className="journal-primary" disabled={busy || !canEdit || !draft.body.trim()} onClick={publish}><UiIcon name={post ? "check" : draft.visibility === "public" ? "share" : "lock"} />{busy ? "사진 불러오는 중…" : post ? "수정 내용 저장" : draft.visibility === "public" ? "이야기 올리기" : "나만의 이야기 저장"}</button><p>이 기기에 저장되는 커뮤니티 미리보기예요</p></footer>
    </div>
    {picker && <Dialog title="이야기에 첨부할 산책" onClose={() => setPicker(false)} className="record-picker-dialog"><p className="dialog-description">이야기에 함께 남길 산책 코스를 선택해 주세요.</p><button type="button" className="picker-close" aria-label="산책 선택 닫기" onClick={() => setPicker(false)}><UiIcon name="close" /></button><div className="record-picker-list">{records.length ? records.map(item => <button type="button" key={item.id} className="record-picker-item" aria-pressed={draft.course?.recordId === item.id} onClick={() => { setDraft({ ...draft, course: attachCourse(item) }); setSourceId(item.id); setPicker(false); }}><CourseAttachmentCard course={attachCourse(item)} /><span className="picker-check">{draft.course?.recordId === item.id && <UiIcon name="check" />}</span></button>) : <EmptyState title="첨부할 산책 기록이 없어요" description="산책을 마치고 나면 코스를 가져올 수 있어요. 사진과 이야기만 먼저 남겨도 좋아요." />}</div></Dialog>}
    {discard && <ConfirmDialog title="작성을 그만둘까요?" description="저장하지 않은 이야기는 사라져요. 첨부한 산책의 원본 기록은 그대로 남아요." confirmLabel="작성 그만두기" onCancel={() => setDiscard(false)} onConfirm={onBack} />}
  </section>;
}
