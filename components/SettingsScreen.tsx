"use client";
import { useState } from "react";
import UiIcon, { type IconName } from "./UiIcon";
import Toggle from "./Toggle";
const groups: { title: string; rows: { label: string; icon: IconName; desc?: string; value?: string }[] }[] = [
  { title: "계정", rows: [{ label: "계정 정보", icon: "person" }, { label: "연결된 계정", icon: "link" }, { label: "로그아웃", icon: "logout" }] },
  { title: "알림", rows: [{ label: "알림 설정", icon: "bell", desc: "산책 리마인드, 커뮤니티 알림" }] },
  { title: "앱 정보", rows: [{ label: "이용약관", icon: "file" }, { label: "개인정보 처리방침", icon: "shield" }, { label: "위치기반서비스 이용약관", icon: "pin" }, { label: "앱 버전", icon: "info", value: "0.1.0" }] },
];
export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [walk, setWalk] = useState(true);
  const [community, setCommunity] = useState(true);
  return <section className="settings-page page-surface">
    <header className="settings-header"><button aria-label="뒤로 가기" onClick={() => selected ? setSelected(null) : onBack()}><UiIcon name="back" /></button><h1>{selected ?? "설정"}</h1></header>
    <div className="settings-content">{selected ? <div className="white-card settings-detail">{selected === "알림 설정" ? <><div className="notification-setting"><span>산책 리마인드</span><Toggle on={walk} onChange={setWalk} label="산책 리마인드" /></div><div className="notification-setting"><span>커뮤니티 알림</span><Toggle on={community} onChange={setCommunity} label="커뮤니티 알림" /></div><p>미리보기 설정이며 실제 알림은 발송되지 않아요.</p></> : <p>{selected === "앱 버전" ? "오늘의길 0.1.0" : `${selected} 기능은 준비 중이에요.`}</p>}</div> : <>{groups.map(group => <section className="settings-group" key={group.title}><h2>{group.title}</h2><div className="white-card">{group.rows.map(row => <button className="settings-row" key={row.label} onClick={() => setSelected(row.label)}><span className="settings-icon"><UiIcon name={row.icon} /></span><span className="settings-label">{row.label}{row.desc && <small>{row.desc}</small>}</span>{row.value && <small>{row.value}</small>}<UiIcon name="chevron" /></button>)}</div></section>)}<button className="withdraw-button" onClick={() => setSelected("회원 탈퇴")}>회원 탈퇴</button></>}</div>
  </section>;
}
