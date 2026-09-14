"use client";

import { formatDate, formatDuration, type WalkRecord } from "@/lib/journal";
import { EmptyState, RoutePreview, ScreenHeader } from "./JournalUI";
import UiIcon from "./UiIcon";

export default function WalkRecordsScreen({ records, onBack, onOpen }: { records: WalkRecord[]; onBack: () => void; onOpen: (record: WalkRecord) => void }) {
  return <section className="page-surface journal-page"><ScreenHeader title="전체 산책 기록" onBack={onBack} /><div className="journal-scroll"><div className="section-heading"><h2 className="records-total">내가 걸어온 길</h2><span className="subtle-badge">{records.length}개의 기록</span></div>{!records.length ? <EmptyState title="첫 산책을 기다리고 있어요" description="산책을 마치면 이곳에 기록이 쌓여요." /> : <div className="all-walk-records">{records.map(record => <button key={record.id} type="button" onClick={() => onOpen(record)} className="all-record-card"><RoutePreview path={record.path} color={record.color} compact /><span><strong>{record.title}</strong><small>{formatDate(record.startedAt)}</small><span>{record.distance.toFixed(2)}km · {formatDuration(record.seconds)}</span></span><UiIcon name="chevron" /></button>)}</div>}</div></section>;
}
