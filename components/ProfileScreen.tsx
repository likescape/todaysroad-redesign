"use client";
import { useState } from "react";
import BrandButton from "./BrandButton";
import UiIcon from "./UiIcon";
const records = [
  { name: "광주천 산책", date: "2026.09.02", distance: "3.2", minutes: 42, color: "#4a9e45", path: "M10 28 40 39 68 29 99 51 119 35" },
  { name: "운천저수지 산책", date: "2026.08.31", distance: "2.1", minutes: 28, color: "#4b95bd", path: "M12 20 41 23 60 37 92 40 119 58" },
  { name: "도심 골목 산책", date: "2026.08.29", distance: "4.0", minutes: 53, color: "#e9a132", path: "M20 20 80 29 96 58 18 51 20 20" },
];
export default function ProfileScreen({ onSettings, onHome }: { onSettings: () => void; onHome: () => void }) {
  const [detail, setDetail] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  return <section className="page-surface profile-page">
    <header className="profile-header"><BrandButton onClick={onHome} /><h1>내 산책</h1><button className="icon-button" aria-label="설정" onClick={onSettings}><UiIcon name="gear" /></button></header>
    <div className="profile-content">
      <button className="profile-card white-card" onClick={() => setNotice("산책러님의 프로필이에요. 계정 연결 기능은 준비 중이에요.")}><span className="profile-avatar"><UiIcon name="person" /></span><span><strong>산책러님</strong><small>이번 달 <b>8번</b> 산책</small></span><UiIcon name="chevron" /></button>
      <div className="account-banner"><span className="account-lock"><UiIcon name="lock" /></span><p>계정을 연결하면<br />산책 기록을 안전하게 보관할 수 있어요</p><button onClick={() => setNotice("계정 연결 기능은 준비 중이에요.")}>계정 연결</button></div>
      <h2>나의 산책</h2><div className="walk-stats">
        <div className="white-card"><span className="stat-icon"><UiIcon name="walk" /></span><span>총 산책</span><strong>12<small>회</small></strong></div>
        <div className="white-card"><span className="stat-icon blue"><UiIcon name="pin" /></span><span>총 거리</span><strong>18.4<small>km</small></strong></div>
        <div className="white-card"><span className="stat-icon purple"><UiIcon name="clock" /></span><span>총 시간</span><strong>4<small>시간</small>32<small>분</small></strong></div>
      </div>
      <h2>최근 산책 기록</h2><div className="walk-records">{records.map((r, i) => <button className="white-card record-row" key={r.name} onClick={() => setDetail(detail === i ? null : i)} aria-expanded={detail === i}><span className="mini-map"><svg viewBox="0 0 132 80" aria-hidden="true"><path className="map-park" d="M50 0h45l-9 30-24 10Z" /><path className="map-river" d="M0 65 132 10" /><path className="map-streets" d="M0 18 132 64M20 0 60 80M85 0 43 80M0 47 132 24M106 0 97 80" /><path d={r.path} fill="none" stroke={r.color} strokeWidth="3" strokeLinejoin="round" /><circle cx={i === 0 ? 10 : i === 1 ? 12 : 20} cy={i === 0 ? 28 : 20} r="4" fill="white" stroke={r.color} strokeWidth="3" /></svg></span><span><strong>{r.name}</strong><small>{r.date} · {r.distance}km · {r.minutes}분</small>{detail === i && <small className="record-detail">산책을 완료했어요 · 기록 미리보기</small>}</span><UiIcon name="chevron" /></button>)}</div>
      <button className="all-records" onClick={() => setNotice("현재 표시된 기록은 디자인 확인용 예시예요.")}>전체 기록 보기 <UiIcon name="chevron" /></button>
      {notice && <div className="inline-notice" role="status">{notice}<button aria-label="안내 닫기" onClick={() => setNotice("")}>×</button></div>}
    </div>
  </section>;
}
