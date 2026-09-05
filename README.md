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

- 데스크톱(뷰포트 > 500px): 아이폰 프레임 이미지를 제거하고 390×844 기준 화면을 중앙에 표시합니다.
  창이 작으면 글자·버튼·지도까지 화면 전체를 동일한 비율로 축소합니다.
- 모바일(뷰포트 ≤ 500px): 실제 기기 뷰포트를 그대로 사용해 풀스크린으로 표시합니다.

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


## 상단 탐색 실험 (`experiment/top-navigation`)

- 기존 하단 탭 버전은 `design/leaf-bottom-nav` 브랜치에 보존했습니다.
- 홈 오른쪽 위: 커뮤니티 / 내 산책 (아이콘 + 작은 라벨).
- 홈 아래: 코스 생성 / 현재 위치만 유지하며 하단 탭은 렌더링하지 않습니다.
- 설정은 내 산책 오른쪽 위에서만 진입하고, 알림 설정은 설정 안에 둡니다.
- 내 산책에서는 왼쪽 오늘의길 로고로 홈에 복귀합니다. 커뮤니티에서는 로고 또는 뒤로 버튼으로 복귀합니다.
- 커뮤니티는 기존대로 진입용 준비 화면만 유지합니다.


## 현재 미리보기: 하단 탐색 복원

- 홈·커뮤니티·내 산책 하단 탭을 복원하고 상단 중복 메뉴를 제거했습니다.
- 코스 생성/현재 위치와 추천 패널은 하단 탭 위에 배치합니다.
- 설정은 내 산책에서 진입하며 설정 화면에서는 하단 탭을 숨깁니다.
- 지도 타일 채도 78%와 390×844 데스크톱 비례 축소는 유지합니다.
