import UiIcon, { type IconName } from "./UiIcon";
export type Tab = "home" | "community" | "my";
export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="주 메뉴">{([
    ["home", "홈", "home"], ["community", "커뮤니티", "people"], ["my", "내 산책", "person"],
  ] as [Tab, string, IconName][]).map(([id, label, icon]) => <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => onChange(id)}><UiIcon name={icon} /><span>{label}</span></button>)}</nav>;
}
