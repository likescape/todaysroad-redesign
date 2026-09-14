# 세 가지 유리 재질 비교

`materials.html`을 브라우저에서 열면 Clear / Regular / Dense를 항상 3열로 비교할 수 있습니다. 기존 `index.html`과 실제 앱은 변경하지 않았습니다.

- 화면: 코스 확인, 이야기 상세
- 테마: 라이트, 다크 (세 열 동시 전환)
- 고정 비교 조건: 지도, 콘텐츠, 배치, 초록색 버튼, 테두리, 그림자, 굴절 설정
- 변화 조건: 각 열의 모든 유리 표면에 적용되는 불투명도와 블러
- 라이트: Clear 62% / 16px, Regular 76% / 20px, Dense 90% / 24px
- 다크: Clear 64% / 16px, Regular 80% / 20px, Dense 92% / 24px

각 열은 재질 자체의 차이를 보기 위한 단일 재질 시안입니다. 실제 적용 계획은 clear를 버튼·탐색에, regular를 일반 카드에, dense를 상세·입력에 함께 사용하는 방식입니다. 하이라이트가 추가되므로 표기한 불투명도는 유리의 기본 배경색 알파 값입니다.

로컬 서버:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory output/glass-preview
```

- 기본: <http://127.0.0.1:4174/materials.html>
- 다크 코스: <http://127.0.0.1:4174/materials.html?screen=course&theme=dark>
- 라이트 이야기: <http://127.0.0.1:4174/materials.html?screen=story&theme=light>
- 다크 이야기: <http://127.0.0.1:4174/materials.html?screen=story&theme=dark>

모든 앱 화면은 재질 검토용 정적 시안이며 상단의 비교 컨트롤만 동작합니다. 페이지는 설치·빌드 없이 직접 열 수 있습니다. `preview.css`, `preview.js`, `map-data.js`, `materials.css`, `materials.js`, `assets/`를 같은 폴더에 유지하세요.

이야기 제목·요약·본문은 `lib/spot-content.json`의 `gongmin-local-legend`를 사용하고, 산책 관찰 문구는 시안용 문구를 추가했습니다. 지도·로고·사진·React Bits 굴절 구현과 라이선스는 기존 [미리보기 출처](README.md#출처)를 따릅니다. 굴절은 기존 미리보기와 같이 지원하는 데스크톱 Chromium에서 일부 컨트롤의 배경에만 적용됩니다.
