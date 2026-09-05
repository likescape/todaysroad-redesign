# 오늘의길

오늘 걷기 좋은 길을 추천해주는 산책 코스 앱 (Next.js + Kakao Map).

## 실행

```bash
npm install
npm run dev
```

→ http://localhost:3000

> **중요: 반드시 3000 포트로 실행해야 합니다.**
> 카카오 개발자 콘솔에 `http://localhost:3000` 도메인만 등록되어 있어,
> 다른 포트에서는 Kakao Map SDK가 401로 거부됩니다.
> 다른 포트/도메인을 쓰려면 [developers.kakao.com](https://developers.kakao.com) →
> 앱 설정 → 플랫폼 → Web 사이트 도메인에 추가하세요.

## 환경 변수

`.env.local`

```
NEXT_PUBLIC_KAKAO_MAP_KEY=<카카오 JavaScript 키>
```

## 구조

- 데스크톱(뷰포트 > 500px): `lightgray` 배경 중앙에 `assets/mockup-frame.png` 목업이 표시되고,
  앱 UI는 목업의 투명한 화면 영역(알파채널 실측값) 안에 렌더링됩니다.
- 모바일(뷰포트 ≤ 500px): 목업 프레임이 사라지고 UI가 100% 풀스크린이 됩니다.

| 파일 | 역할 |
| --- | --- |
| `app/page.tsx` | 목업 프레임 스테이지 + 화면 영역 배치 |
| `components/AppScreen.tsx` | 화면 전체 조립 (지도 + UI 오버레이) |
| `components/KakaoMap.tsx` | 카카오맵, 현재위치/추천코스 마커(CustomOverlay), 코스 라인(Polyline) |
| `components/BrandButton.tsx` | 좌상단 '오늘의길' 버튼 — 항상 유지, 클릭 시 처음 화면으로 복귀 |
| `components/TopActions.tsx` | 우상단 알림/설정 버튼 (클릭 시 패널로 모핑) |
| `components/IslandPanel.tsx` | 버튼에서 확장되는 밝은 팝업 셸 (다이나믹 아일랜드 모핑) |
| `components/NotificationsPanel.tsx` | 알림 설정 패널 내용 |
| `components/SettingsPanel.tsx` | 기존 지도 스타일 설정 컴포넌트 (현재 화면에서 미사용) |
| `components/RecommendPanel.tsx` | 코스 추천 패널 — 희망 시간 + 분위기 태그 선택 |
| `components/Segmented.tsx`, `Toggle.tsx` | 패널 공용 컨트롤 |
| `components/BottomControls.tsx` | 하단 '코스 추천받기' 버튼 + 현재 위치 이동 버튼 |
| `components/CourseSheet.tsx` | 추천 코스 마커 클릭 시 뜨는 하단 설명 시트 |
| `lib/courses.ts` | 추천 코스 데이터 / 지도 중심·현재위치 좌표 |
| `lib/motion.ts` | 공용 스프링/리빌 트랜지션 (motion.dev) |
| `lib/types.ts` | `Panel`, `MapStyle`, `RecommendPrefs` 타입 |

## 인터랙션

- 우상단 알림/설정, 하단 '코스 추천받기' 버튼을 누르면 iOS 다이나믹 아일랜드처럼
  버튼 자리에서 밝은 패널이 스프링으로 확장되고, 닫으면 다시 버튼으로 줄어듭니다
  (`motion`의 shared `layoutId` + `AnimatePresence`).
- '오늘의길' 버튼은 어떤 상태에서도 유지되며 클릭 시 패널·시트를 닫고 지도를 초기 위치로 되돌립니다.
- 스크림 클릭 또는 `Esc`로도 패널을 닫을 수 있습니다.

지도는 드래그 이동, 휠/핀치 제스처 확대·축소가 가능합니다.
추천 코스 말풍선 마커를 클릭하면 하단에 코스 설명 시트가 열리고,
지도 빈 곳을 클릭하면 닫힙니다.


## 밝은 잎 테마 리디자인

- 제공받은 잎 로고 원본을 `public/assets/leaf-logo.png`에서 사용합니다.
- 홈의 지도/코스 생성, 하단 홈·커뮤니티·마이 탭, 마이 → 설정 → 뒤로 가기를 연결했습니다.
- 마이의 산책 통계와 기록은 디자인 확인용 예시 데이터입니다.
- 계정 연결, 계정 관리, 약관은 준비 안내 화면이며 실제 계정 변경은 실행하지 않습니다.
- 설정의 알림 토글은 세션 내 미리보기이며 실제 발송/서버 저장 기능은 없습니다.
- 커뮤니티는 진입 화면만 있으며 상세 디자인과 백엔드는 구현 범위에서 제외했습니다.
- 공유 기능 요구사항은 [커뮤니티 기능 범위](docs/community-requirements.md)를 참고하세요.
