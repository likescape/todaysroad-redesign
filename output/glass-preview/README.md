# 오늘의길 Glass 메인 화면 미리보기

[디자인 계획](../../docs/liquid-glass-plan.md)을 시각적으로 검토하는 독립적인 싱글 페이지입니다. 실제 앱의 구현을 변경하지 않습니다.

## 열기

`index.html`을 브라우저에서 직접 열 수 있습니다. 같은 폴더의 CSS, JavaScript, `assets/`를 함께 유지하세요.

로컬 서버로 열려면 프로젝트 루트에서:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory output/glass-preview
```

주소: <http://127.0.0.1:4173/>

- `?view=compare&scene=course`: 라이트·다크 코스 확인 화면 (기본값)
- `?view=light&scene=home`: 라이트 홈
- `?view=dark&scene=walking`: 다크 산책 중

## 확인할 수 있는 동작

- 홈 / 코스 확인 / 산책 중 전환, 라이트 / 다크 / 나란히 비교
- 코스 생성 → 추천 패널 → 예시 코스 → 산책 시작 → 종료 확인
- 설정에서 각 화면의 테마 전환
- 이 길의 이야기 목록·상세와 대화상자 닫기, Escape, 키보드 포커스 이동

하단 커뮤니티·내 산책은 화면 배치를 보여주는 비활성 미리보기 항목입니다. 지도는 정적인 미리보기이며 위치 버튼은 현재 시야 안내만 표시합니다. 지도 드래그, 실제 코스 추천, GPS, 기록 저장, 게시 기능은 구현하지 않습니다. 산책 시간은 예시 04:32부터 흐르고 거리는 예시 값입니다.

## 유리 재질

- 계획의 clear / regular / dense 불투명도와 16 / 20 / 24px 블러를 사용합니다.
- React Bits `GlassSurface`의 SVG displacement map 생성 방식을 정적인 페이지에 맞게 JavaScript로 옮겼습니다. 원본의 색 채널별 과장된 굴절은 한 개의 낮은 강도 필터로 단순화했고, 유리 배경에만 적용합니다.
- 굴절은 정밀 포인터가 있는 Chromium에서 일부 떠 있는 컨트롤에 적용합니다. 모바일·Safari·Firefox에서는 CSS 블러 재질을 사용합니다. 기기의 모션·투명도 감소 설정과 블러 미지원 대체 표면을 포함합니다.
- 화면당 테마는 미리보기 메모리에만 유지하며 앱의 localStorage 설정을 읽거나 쓰지 않습니다.

## 출처

- React Bits / David Haz: https://github.com/DavidHDev/react-bits
- 기준 커밋: `4bb4491b3879b115eb6758fae7f5b6c3ec7eb0a3`
- 원본과 라이선스: `vendor/` (MIT + Commons Clause). 원본 TypeScript는 `.tsx.txt`로 보관해 본 앱의 타입 검사 대상에서 제외했습니다.
- 로고·코스 예시 사진·아이콘: 기존 오늘의길 프로젝트의 자산과 `UiIcon` 구현.
- 지도: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright. 이 로컬 시안에 필요한 타일 8장을 한 번 다운로드했습니다. 원래 앱은 계속 카카오 지도를 사용합니다.
- 경로: 기존 `SPOT_PREVIEW_COURSE`의 개발용 가상 좌표를 Web Mercator로 투영했습니다. 실제 보행 가능 경로를 의미하지 않습니다.
- 본문 일부는 상세 표면의 가독성을 검토하기 위한 시안 문구입니다.

페이지는 별도 설치나 빌드 없이 동작하는 정적 파일입니다. 외부 글꼴을 불러오지 못하면 시스템 한글 글꼴로 표시합니다.
