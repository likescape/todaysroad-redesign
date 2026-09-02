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
| `components/TopBar.tsx` | 좌상단 '오늘의길' 로고 pill + 우상단 알림/설정 버튼 |
| `components/BottomControls.tsx` | 하단 '코스 추천받기' 버튼 + 현재 위치 이동 버튼 |
| `components/CourseSheet.tsx` | 추천 코스 마커 클릭 시 뜨는 하단 설명 시트 |
| `lib/courses.ts` | 추천 코스 데이터 / 지도 중심·현재위치 좌표 |

지도는 드래그 이동, 휠/핀치 제스처 확대·축소가 가능합니다.
추천 코스 말풍선 마커를 클릭하면 하단에 코스 설명 시트가 열리고,
지도 빈 곳을 클릭하면 닫힙니다.
