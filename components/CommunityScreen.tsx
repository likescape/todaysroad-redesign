"use client";

import { useState } from "react";
import { CURRENT_USER, formatDate, visiblePosts, type CommunityPost, type CourseAttachment } from "@/lib/journal";
import BrandButton from "./BrandButton";
import UiIcon from "./UiIcon";
import { ConfirmDialog, CourseAttachmentCard, EmptyState, ErrorMessage, PhotoGallery, ScreenHeader } from "./JournalUI";

export function PostAuthor({ post }: { post: CommunityPost }) {
  const own = post.authorId === CURRENT_USER.id;
  return <div className="post-author"><span className={`author-avatar${own ? " own" : ""}`} aria-hidden="true">{own ? <UiIcon name="person" /> : post.authorName.slice(0, 1)}</span><span><strong>{post.authorName}{own && <b>나</b>}</strong><small>{formatDate(post.createdAt)}{post.updatedAt !== post.createdAt ? " · 수정됨" : ""}{post.example ? " · 예시" : ""}</small></span><span className="post-visibility"><UiIcon name={post.visibility === "public" ? "globe" : "lock"} /><span>{post.visibility === "public" ? "공개" : "나만 보기"}</span></span></div>;
}

export default function CommunityScreen({ posts, mine, onFilterChange, ready, error, onRetry, onHome, onWrite, onOpen, onCourse }: {
  posts: CommunityPost[]; mine: boolean; onFilterChange: (mine: boolean) => void; ready: boolean; error: string; onRetry: () => void;
  onHome: () => void; onWrite: () => void; onOpen: (post: CommunityPost) => void; onCourse: (course: CourseAttachment) => void;
}) {
  const [limit, setLimit] = useState(3);
  const filtered = visiblePosts(posts, mine);
  return <section className="page-surface community-page">
    <header className="profile-header community-header"><BrandButton onClick={onHome} iconOnly /><h1>커뮤니티</h1><span className="community-header-icon"><UiIcon name="people" /></span></header>
    <div className="community-scroll">
      <div className="community-intro"><span className="eyebrow">한 걸음, 하나의 이야기</span><h2>같이 나누는 산책</h2><p>오늘 만난 풍경과 나만의 길을 나눠요.</p></div>
      <div className="community-tabs" aria-label="산책 이야기 필터">{[[false, "모두의 산책"], [true, "내 이야기"]].map(([value, label]) => <button key={String(value)} type="button" aria-pressed={mine === value} onClick={() => { onFilterChange(Boolean(value)); setLimit(3); }}>{label}</button>)}<span>{filtered.length}개의 이야기</span></div>
      {error && <ErrorMessage message={error} onRetry={onRetry} />}
      {!ready ? <div className="feed-loading" role="status"><span />산책 이야기를 불러오고 있어요.</div> : !filtered.length ? <EmptyState title={mine ? "나의 첫 이야기를 남겨볼까요?" : "아직 산책 이야기가 없어요"} description={mine ? "사진과 글로 남기고, 나만 보기로 간직할 수도 있어요." : "오늘 걸었던 길로 첫 이야기를 시작해 주세요."} action={<button type="button" className="journal-primary" onClick={onWrite}><UiIcon name="edit" /> 이야기 쓰기</button>} /> : <div className="community-feed">{filtered.slice(0, limit).map(post => <article className="post-card" key={post.id}>
        <PostAuthor post={post} />
        <button type="button" className="post-copy" onClick={() => onOpen(post)} aria-label={`${post.authorName}님의 산책 이야기 보기`}><p className="preserve-text">{post.body}</p></button>
        <PhotoGallery photos={post.photos} />
        {post.course && <CourseAttachmentCard course={post.course} onClick={() => onCourse(post.course!)} />}
        <button type="button" className="post-read-more" onClick={() => onOpen(post)}>이야기 보기 <UiIcon name="chevron" /></button>
      </article>)}</div>}
      {filtered.length > limit && <button type="button" className="load-more" onClick={() => setLimit(value => value + 3)}>이야기 더 보기 <span>{Math.min(limit, filtered.length)} / {filtered.length}</span><UiIcon name="plus" /></button>}
      <p className="local-caption">예시 이야기와 이 기기에 저장한 글이 표시돼요.</p>
    </div>
    <button className="community-write" type="button" onClick={onWrite} disabled={!ready || !!error}><UiIcon name="edit" /><span>이야기 쓰기</span></button>
  </section>;
}

export function CommunityPostScreen({ post, onBack, onEdit, onDelete, onCourse }: {
  post: CommunityPost; onBack: () => void; onEdit: () => void; onDelete: () => void; onCourse: (course: CourseAttachment) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const own = post.authorId === CURRENT_USER.id;
  return <section className="page-surface journal-page post-page"><div className="journal-layout" inert={confirmDelete}>
    <ScreenHeader title="산책 이야기" onBack={onBack} action={own && <button type="button" className="header-text-button" onClick={onEdit}>수정</button>} />
    <div className="journal-scroll"><article className="post-detail"><PostAuthor post={post} /><p className="post-full-copy preserve-text">{post.body}</p><PhotoGallery photos={post.photos} />{post.course && <section className="post-course-section"><h2>이야기 속 산책 코스</h2><CourseAttachmentCard course={post.course} onClick={() => onCourse(post.course!)} /></section>}</article>
      {own && <div className="post-owner-actions"><span><UiIcon name={post.visibility === "public" ? "globe" : "lock"} />{post.visibility === "public" ? "모두의 산책에 공개한 글이에요" : "나에게만 보이는 이야기예요"}</span><button type="button" onClick={() => setConfirmDelete(true)}><UiIcon name="trash" />글 삭제</button></div>}
      <p className="local-caption">{post.example ? "디자인 확인용 예시 이야기예요." : "이 기기에 저장된 이야기예요."}</p>
    </div></div>
    {confirmDelete && <ConfirmDialog title="이 이야기를 삭제할까요?" description="삭제한 글은 되돌릴 수 없어요. 내 산책의 원본 기록과 사진은 그대로 남아요." confirmLabel="글 삭제" danger error={error} onCancel={() => { setConfirmDelete(false); setError(""); }} onConfirm={() => { try { onDelete(); } catch (err) { setError(err instanceof Error ? err.message : "삭제하지 못했어요."); } }} />}
  </section>;
}
