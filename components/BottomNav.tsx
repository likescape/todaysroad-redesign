import UiIcon, { type IconName } from "./UiIcon";
export type Tab = "home" | "community" | "my";
export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="주 메뉴">{([
    ["home", "코스 생성", "home"], ["community", "커뮤니티", "people"], ["my", "내 산책", "person"],
  ] as [Tab, string, IconName][]).map(([id, label, icon]) => <button key={id} type="button" aria-label={label} aria-current={tab === id ? "page" : undefined} onClick={() => onChange(id)}>{id === "home" ? <svg aria-hidden="true" width="29" height="29" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1.5c.7 5 2.5 7 6.5 8-4 1-5.8 3-6.5 8-.7-5-2.5-7-6.5-8 4-1 5.8-3 6.5-8ZM18 11c.4 3 1.6 4.3 4 5-2.4.7-3.6 2-4 5-.4-3-1.6-4.3-4-5 2.4-.7 3.6-2 4-5Z" /></svg> : <UiIcon name={icon} />}<span aria-hidden="true">{label}</span></button>)}</nav>;
}
