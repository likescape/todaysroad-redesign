"use client";

import { useTheme } from "./ThemeProvider";
import UiIcon from "./UiIcon";
import Toggle from "./Toggle";

export default function AppearanceSettings() {
  const { theme, preference, setPreference } = useTheme();
  return <section className="settings-group appearance-settings" aria-labelledby="appearance-heading">
    <h2 id="appearance-heading">화면 모드</h2>
    <div className="white-card">
      <div className="appearance-options" role="group" aria-label="화면 모드 선택">
        {(["light", "dark"] as const).map(mode => <button key={mode} type="button" className="appearance-option" data-appearance={mode} aria-pressed={theme === mode} onClick={() => setPreference(mode)}>
          <span className="appearance-preview" aria-hidden="true">
            <span className="appearance-preview-brand"><img src={mode === "dark" ? "/assets/leaf-logo-dark.png" : "/assets/leaf-logo.png"} alt="" /></span>
            <span className="appearance-preview-path" />
            <span className="appearance-preview-pin" />
            <span className="appearance-preview-nav"><i /><i /><i /></span>
          </span>
          <span className="appearance-option-label"><UiIcon name={mode === "dark" ? "moon" : "sun"} />{mode === "dark" ? "다크 모드" : "라이트 모드"}<span className="appearance-check">{theme === mode && <UiIcon name="check" />}</span></span>
        </button>)}
      </div>
      <div className="appearance-system">
        <span><strong>기기 설정 따르기</strong><small>휴대폰의 화면 모드에 맞춰 바뀌어요</small></span>
        <Toggle on={preference === "system"} onChange={on => setPreference(on ? "system" : theme)} label="기기 설정 따르기" />
      </div>
    </div>
  </section>;
}
