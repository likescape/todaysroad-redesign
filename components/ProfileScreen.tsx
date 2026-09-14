"use client";
import { useState } from "react";
import BrandButton from "./BrandButton";
import UiIcon from "./UiIcon";
import { formatDate, formatDuration, routeDrawing, type WalkRecord } from "@/lib/journal";
export default function ProfileScreen({ onSettings, onHome, records, onOpenRecord, onAllRecords }: { onSettings: () => void; onHome: () => void; records: WalkRecord[]; onOpenRecord: (record: WalkRecord) => void; onAllRecords: () => void }) {
  const added = records.filter(record => !record.example);
  const totalMinutes = 272 + Math.floor(added.reduce((sum, record) => sum + record.seconds, 0) / 60);
  const month = new Date().toISOString().slice(0, 7);
  const monthCount = 8 + added.filter(record => record.startedAt.slice(0, 7) === month).length;
  const [notice, setNotice] = useState("");
  return <section className="page-surface profile-page">
    <header className="profile-header"><BrandButton onClick={onHome} iconOnly /><h1>내 산책</h1><button className="icon-button" aria-label="설정" onClick={onSettings}><UiIcon name="gear" /></button></header>
    <div className="profile-content">
      <button className="profile-card white-card" onClick={() => setNotice("산책러님의 프로필이에요. 계정 연결 기능은 준비 중이에요.")}><span className="profile-avatar"><UiIcon name="person" /></span><span><strong>산책러님</strong><small>이번 달 <b>{monthCount}번</b> 산책</small></span><UiIcon name="chevron" /></button>
      <div className="account-banner"><span className="account-lock"><UiIcon name="lock" /></span><p>계정을 연결하면<br />산책 기록을 안전하게 보관할 수 있어요</p><button onClick={() => setNotice("계정 연결 기능은 준비 중이에요.")}>계정 연결</button></div>
      <h2>나의 산책</h2><div className="walk-stats">
        <div className="white-card"><span className="stat-icon stat-icon-walk"><UiIcon name="walk" /></span><span>총 산책</span><strong>{12 + added.length}<small>회</small></strong></div>
        <div className="white-card"><span className="stat-icon blue"><UiIcon name="pin" /></span><span>총 거리</span><strong>{(18.4 + added.reduce((sum, record) => sum + record.distance, 0)).toFixed(1)}<small>km</small></strong></div>
        <div className="white-card"><span className="stat-icon purple"><UiIcon name="clock" /></span><span>총 시간</span><strong>{Math.floor(totalMinutes / 60)}<small>시간</small>{totalMinutes % 60}<small>분</small></strong></div>
      </div>
      <h2>최근 산책 기록</h2><div className="walk-records">{records.slice(0, 3).map((r) => {
        const points = routeDrawing(r.path, 132, 80, 12);
        const path = r.thumbnailPath ?? (points.length ? `M${points.map(p => `${p.x} ${p.y}`).join(" ")}` : "");
        const first = r.thumbnailPath?.match(/^M(\d+) (\d+)/);
        const x = first ? Number(first[1]) : points[0]?.x;
        const y = first ? Number(first[2]) : points[0]?.y;
        return <button className="white-card record-row" key={r.id} onClick={() => onOpenRecord(r)} aria-label={`${r.title} 기록 보기`}><span className="mini-map"><svg viewBox="0 0 132 80" aria-hidden="true"><path className="map-park" d="M50 0h45l-9 30-24 10Z" /><path className="map-river" d="M0 65 132 10" /><path className="map-streets" d="M0 18 132 64M20 0 60 80M85 0 43 80M0 47 132 24M106 0 97 80" /><path className="mini-route" d={path} fill="none" stroke={r.color} strokeWidth="3" strokeLinejoin="round" />{x !== undefined && <circle className="mini-route-start" cx={x} cy={y} r="4" fill="white" stroke={r.color} strokeWidth="3" />}</svg></span><span><strong>{r.title}</strong><small>{formatDate(r.startedAt)} · {r.distance.toFixed(1)}km · {formatDuration(r.seconds)}</small></span><UiIcon name="chevron" /></button>;
      })}</div>
      <button className="all-records" onClick={onAllRecords}>전체 기록 보기 <UiIcon name="chevron" /></button>
      {notice && <div className="inline-notice" role="status">{notice}<button aria-label="안내 닫기" onClick={() => setNotice("")}>×</button></div>}
    </div>
  </section>;
}
