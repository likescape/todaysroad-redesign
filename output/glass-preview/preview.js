/*
 * Today's Road local UI study.
 * Background displacement adapted from David Haz / React Bits GlassSurface.
 * Original commit, source, and MIT + Commons Clause notice: ./vendor/.
 * This standalone study does not change the application's theme or journal storage.
 */
(() => {
  'use strict';
  const root = document.getElementById('glass-preview');
  const phones = [...root.querySelectorAll('.phone')];
  const map = window.GLASS_MAP;
  function fitPreview() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = width <= 440 ? Math.max(.5,(width - 32) / 390) : width >= 800 && height <= 850 ? .72 : width >= 800 && height <= 1000 ? .84 : 1;
    document.documentElement.style.setProperty('--preview-scale',String(scale));
  }
  fitPreview();
  window.addEventListener('resize',fitPreview,{passive:true});
  const paths = {
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
    moon: 'M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z',
    home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',
    person: 'M20 21v-2a7 7 0 0 0-14 0v2ZM12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    gear: 'M10 2h4l.5 2.8 1.6.9 2.7-.9 2 3.4-2.2 1.9v3.8l2.2 1.9-2 3.4-2.7-.9-1.6.9L14 22h-4l-.5-2.8-1.6-.9-2.7.9-2-3.4 2.2-1.9v-3.8L3.2 8.2l2-3.4 2.7.9 1.6-.9L10 2Z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v5l4 2',
    close: 'm6 6 12 12M6 18 18 6',
    chevron: 'm9 5 7 7-7 7',
    walk: 'M8.6 5.2c.6-.3 1.1.2.9 1-.6 2.1 1.2 3.3 3.7 2.1 1.4-.9 1.7-.4 2.1.6l1.9 4.3c.3 1 1.1 1.4 2.4 2.2 1.5.9 2 2.1.7 3.2-.5.6-1.5 1-2.6 1h-3.1c-1.6 0-2.6-.4-3.8-1.4l-6.9-5.5c-1.2-.9-1.3-1.9-.3-3.2L8 5.5q.3-.3.6-.3ZM3.6 9.5l8.8 6.7c1.3 1.1 4.3 2.4 6.4 3.2M11.9 11.7l2.2-.5m-.9 2.4 1.8-.4',
    locate: 'M12 2v3M12 19v3M2 12h3M19 12h3',
    sparkle: 'M12 3c.6 4.5 2.5 7 7 9-4.5 2-6.4 4.5-7 9-.6-4.5-2.5-7-7-9 4.5-2 6.4-4.5 7-9Z',
    wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0m-3 4h.01',
    check: 'm5 12 4 4L19 6',
    play: 'm9 5 11 7-11 7Z'
  };
  function icon(name) {
    const extra = name === 'gear' ? '<circle cx="12" cy="12" r="3.2"/>' : name === 'locate' ? '<circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>' : '';
    return `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="${name === 'play' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${name === 'walk' ? '1.3' : '1.8'}" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/>${extra}</svg>`;
  }
  root.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
  const coordinates = map.path.map(point => point.join(',')).join(' ');
  const first = map.path[0];
  const locationButton = (className) => `<button type="button" class="icon-button glass ${className}" data-action="locate" data-refraction="true" aria-label="현재 위치로 이동">${icon('locate')}</button>`;
  const nav = `<nav class="bottom-nav glass" data-refraction="true" aria-label="주 메뉴"><button type="button" data-action="home" aria-current="page">${icon('home')}<span>홈</span></button><button type="button" aria-disabled="true" aria-label="커뮤니티 · 이 시안에서는 홈 화면만 미리 봅니다">${icon('people')}<span>커뮤니티</span></button><button type="button" aria-disabled="true" aria-label="내 산책 · 이 시안에서는 홈 화면만 미리 봅니다">${icon('person')}<span>내 산책</span></button></nav>`;
  let scene = 'course';
  let walkStarted = Date.now();
  let interval = null;
  const modalFocus = new WeakMap();
  const inertElements = new WeakMap();
  const toastTimers = new WeakMap();

  phones.forEach((phone, index) => {
    phone.innerHTML = `
      <div class="map-canvas" aria-label="광흥창 주변 지도와 미리보기용 가상 코스">
        <div class="map-tiles">${map.tiles.map(tile => `<img src="${tile.src}" alt="" width="256" height="256" draggable="false" style="left:${tile.left}px;top:${tile.top}px">`).join('')}</div>
        <div class="map-shade"></div>
        <svg class="map-route" viewBox="0 0 390 844" aria-hidden="true"><polyline class="route-halo" points="${coordinates}"/><polyline class="route-line" points="${coordinates}"/><circle class="route-start" cx="${first[0]}" cy="${first[1]}" r="6"/></svg>
      </div>
      <div class="status-bar" aria-hidden="true"><span>10:13</span><span class="status-right"><span class="signal"><i></i><i></i><i></i><i></i></span>${icon('wifi')}<span class="battery"></span></span></div>
      <div class="top-bar">
        <button type="button" class="brand-pill glass" data-refraction="true" data-action="home" aria-label="오늘의길 처음 화면으로 돌아가기"><img class="brand-light" src="assets/leaf-logo.png" alt=""><img class="brand-dark" src="assets/leaf-logo-dark.png" alt=""><span>오늘의길</span></button>
        <div class="top-actions"><button type="button" class="icon-button glass top-stop" data-action="finish" aria-label="산책 종료"><span class="stop-mark"></span></button><button type="button" class="icon-button glass" data-action="settings" aria-label="설정">${icon('gear')}</button></div>
      </div>
      <button type="button" class="map-marker marker-first glass regular" data-action="course"><span class="marker-title"><i></i>신수동 골목길</span><small>0.3km · 4분</small></button>
      <button type="button" class="map-marker marker-second glass regular" data-action="course"><span class="marker-title"><i></i>대흥동 골목길</span><small>0.5km · 7분</small></button>
      <button type="button" class="spot-pin spot-one" data-action="story" aria-label="이 길의 이야기 1">${icon('sparkle')}<span>1</span></button>
      <button type="button" class="spot-pin spot-two" data-action="story" aria-label="이 길의 이야기 2">${icon('sparkle')}<span>2</span></button>
      <button type="button" class="spot-pin spot-three" data-action="story" aria-label="이 길의 이야기 3">${icon('sparkle')}<span>3</span></button>
      <span class="current-position" aria-label="예시 현재 위치"></span>
      <div class="home-controls"><button type="button" class="generate-button glass" data-action="recommend">${icon('sparkle')}<span>코스 생성</span></button>${locationButton('home-locate')}</div>
      <section class="course-area" aria-label="추천 코스 정보">
        ${locationButton('course-locate')}
        <div class="course-sheet glass regular">
          <button type="button" class="sheet-handle" data-action="home" aria-label="코스 닫기"><span></span></button>
          <div class="eyebrow"><img src="assets/leaf-logo.png" alt=""><span>오늘의 추천 코스</span></div>
          <div class="course-info"><div class="course-copy"><h3>광흥창 이야기 산책</h3><div class="chips"><span>${icon('walk')}1.0km</span><span>${icon('clock')}15분</span><span>▥&nbsp; 쉬움</span></div></div><img class="course-photo" src="assets/example-thumbnail.jpg" alt="산책길 예시 사진" width="71" height="71"></div>
          <p class="course-desc">익숙한 골목에 숨은 이야기를 따라,<br>오늘은 조금 다르게 걸어볼까요?</p>
          <div class="course-divider"></div>
          <div class="story-heading"><span>이 길에서 발견할 이야기</span><button type="button" class="text-button" data-action="stories">3개 모두 보기</button></div>
          <button type="button" class="story-row" data-action="story"><span class="story-number">1</span><span class="story-copy">창고 관리인의 꿈에 나타난 왕<small>공민왕 사당</small></span>${icon('chevron')}</button>
          <button type="button" class="primary-button" data-action="start">${icon('play')}<span>산책 시작</span></button>
        </div>
      </section>
      <div class="walk-area"><button type="button" class="walk-stories glass regular" data-action="stories">${icon('sparkle')}<span>이 길의 이야기</span><strong>3</strong></button>${locationButton('walk-locate')}<dl class="walk-metrics glass regular" aria-label="산책 기록"><div><dt>산책 시간</dt><dd class="walk-time">04:32</dd></div><div><dt>걸은 거리</dt><dd>0.30<small>km</small></dd></div><div><dt>남은 거리</dt><dd>0.70<small>km</small></dd></div></dl></div>
      ${nav}
      <span class="map-scale" aria-hidden="true">100 m</span><a class="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      <div class="modal-scrim" hidden><section class="preview-dialog glass dense" role="dialog" aria-modal="true" aria-labelledby="dialog-title-${index}" tabindex="-1"></section></div>
      <div class="preview-toast glass dense" role="status" hidden></div>`;
  });

  function announce(text) { document.getElementById('preview-announcement').textContent = text; }
  function showToast(phone, message) {
    const toast = phone.querySelector('.preview-toast');
    clearTimeout(toastTimers.get(phone));
    toast.textContent = message;
    toast.hidden = false;
    toastTimers.set(phone, setTimeout(() => { toast.hidden = true; }, 2300));
  }
  function closeModal(phone, restore = true) {
    const scrim = phone.querySelector('.modal-scrim');
    if (scrim.hidden) return;
    scrim.hidden = true;
    (inertElements.get(phone) || []).forEach(element => { element.inert = false; });
    inertElements.delete(phone);
    if (restore) modalFocus.get(phone)?.focus();
  }
  function showModal(phone, title, content, material = 'dense') {
    closeModal(phone, false);
    modalFocus.set(phone, document.activeElement);
    const scrim = phone.querySelector('.modal-scrim');
    const panel = scrim.querySelector('.preview-dialog');
    const index = phones.indexOf(phone);
    panel.className = `preview-dialog glass ${material}`;
    panel.innerHTML = `<div class="dialog-heading"><h3 id="dialog-title-${index}">${title}</h3><button type="button" class="close-dialog" data-action="close" aria-label="닫기">${icon('close')}</button></div>${content}`;
    const siblings = [...phone.children].filter(node => node !== scrim && !node.inert && !node.classList.contains('preview-toast'));
    siblings.forEach(node => { node.inert = true; });
    inertElements.set(phone, siblings);
    scrim.hidden = false;
    panel.querySelector('button')?.focus();
  }
  function updateTime() {
    const elapsed = 272 + Math.floor((Date.now() - walkStarted) / 1000);
    const formatted = `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;
    phones.forEach(phone => { phone.querySelector('.walk-time').textContent = formatted; });
  }
  function setScene(next) {
    scene = next;
    phones.forEach(phone => {
      closeModal(phone, false);
      phone.dataset.state = next;
      const marker = phone.querySelector('.current-position');
      marker.setAttribute('aria-label', next === 'walking' ? '산책 중 예시 위치' : '예시 현재 위치');
    });
    root.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === next)));
    clearInterval(interval);
    interval = null;
    if (next === 'walking') {
      walkStarted = Date.now();
      updateTime();
      interval = setInterval(updateTime, 1000);
    }
    announce(`${({home:'홈',course:'코스 확인',walking:'산책 중'})[next]} 화면`);
  }
  function setView(view) {
    root.dataset.view = view;
    root.querySelectorAll('button[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    // The labels in the comparison refer to fixed reference appearances.
    phones.forEach(phone => { setTheme(phone,phone.closest('[data-study]').dataset.study); });
    announce(`${({compare:'라이트·다크 나란히',light:'라이트',dark:'다크'})[view]} 보기`);
  }
  function setTheme(phone,theme) {
    phone.dataset.theme = theme;
    phone.setAttribute('aria-label',`${theme === 'light' ? '라이트' : '다크'} 모드 앱 미리보기`);
    const caption = phone.closest('.phone-study').querySelector('.study-caption');
    caption.querySelector('h2').innerHTML = `<span class="theme-dot ${theme}-dot"></span>${theme.toUpperCase()}`;
    caption.lastElementChild.textContent = theme === 'light' ? '맑고 부드러운 유리' : '깊고 차분한 유리';
  }
  function showSettings(phone) {
    showModal(phone,'화면 모드',`<div class="theme-options"><button type="button" data-theme-choice="light" aria-pressed="${phone.dataset.theme === 'light'}">${icon('sun')}라이트 모드</button><button type="button" data-theme-choice="dark" aria-pressed="${phone.dataset.theme === 'dark'}">${icon('moon')}다크 모드</button></div>`);
  }
  function showStories(phone) {
    const stories = [ ['창고 관리인의 꿈에 나타난 왕','공민왕 사당'], ['골목에서 만나는 오래된 흔적','광흥당'], ['시간이 쌓인 골목의 건물','독막로 176-1'] ];
    showModal(phone,'이 길의 이야기',stories.map(([title,place], index) => `<button type="button" class="story-row" data-action="story"><span class="story-number">${index + 1}</span><span class="story-copy">${title}<small>${place}</small></span>${icon('chevron')}</button>`).join('')+`<button type="button" class="primary-button" data-action="close">${scene === 'walking' ? '산책' : '코스'}으로 돌아가기</button>`);
  }
  const actions = {
    home: () => setScene('home'),
    course: () => { if (scene !== 'walking') setScene('course'); },
    locate: phone => showToast(phone,'현재 위치를 중심으로 보고 있어요'),
    settings: showSettings,
    close: phone => closeModal(phone),
    start: () => setScene('walking'),
    recommend: phone => showModal(phone,'코스 추천',`<h4>얼마나 걸을까요?</h4><div class="duration-options" aria-label="산책 시간">${[15,30,45].map(time => `<button type="button" data-duration="${time}" aria-pressed="${time === 15}">${time}분</button>`).join('')}</div><h4>어떤 길이 좋아요?</h4><div class="mood-options" aria-label="산책 분위기">${['조용한','초록이 많은','골목길','강을 따라'].map((mood,index) => `<button type="button" data-mood="${mood}" aria-pressed="${index === 0}">${mood}</button>`).join('')}</div><p class="recommend-note">지금 내 발걸음에 맞는 길을 만나보세요.</p><button type="button" class="primary-button" data-action="generate">${icon('sparkle')}추천 받기</button>`,'regular'),
    generate: phone => {setScene('course');showToast(phone,'예시 코스를 보여드릴게요');},
    stories: showStories,
    story: phone => showModal(phone,'이 길의 이야기',`<span class="story-badge">공민왕 사당</span><h4 class="dialog-story-title">창고 관리인의 꿈에<br>나타난 왕</h4><p class="dialog-description">산책길에서 잠시 멈춰, 이 장소에 담긴 이야기를 만나보세요. 같은 길도 알고 걸으면 조금 다르게 보입니다.</p><p class="dialog-description">이 화면은 이야기 상세의 유리 재질과 읽기 편한 본문을 살펴보는 시안입니다.</p><button type="button" class="primary-button" data-action="close">${scene === 'walking' ? '산책' : '코스'}으로 돌아가기</button>`),
    finish: phone => showModal(phone,'산책을 마칠까요?',`<p class="dialog-description">오늘 걸은 길을 돌아보며<br>잠깐의 산책을 마무리해요.</p><button type="button" class="primary-button" data-action="confirm-finish">산책 마치기</button><button type="button" class="secondary-button" data-action="close">계속 걷기</button>`),
    'confirm-finish': phone => {setScene('home');showToast(phone,'산책 완료 화면까지 살펴봤어요');}
  };

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) {
      const scrim = event.target.closest('.modal-scrim');
      if (scrim && event.target === scrim) closeModal(scrim.closest('.phone'));
      return;
    }
    if (button.hasAttribute('data-scene')) {setScene(button.dataset.scene);return;}
    if (button.hasAttribute('data-view')) {setView(button.dataset.view);return;}
    const phone = button.closest('.phone');
    if (!phone) return;
    if (button.dataset.themeChoice) {
      setTheme(phone,button.dataset.themeChoice);
      phone.querySelectorAll('[data-theme-choice]').forEach(option => option.setAttribute('aria-pressed',String(option.dataset.themeChoice === button.dataset.themeChoice)));
      announce(`${button.dataset.themeChoice === 'dark' ? '다크' : '라이트'} 모드`);
    } else if (button.dataset.duration) {
      button.closest('.duration-options').querySelectorAll('button').forEach(option => option.setAttribute('aria-pressed',String(option === button)));
    } else if (button.dataset.mood) {
      button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed') !== 'true'));
    } else {
      actions[button.dataset.action]?.(phone);
    }
  });
  document.addEventListener('keydown', event => {
    const phone = document.activeElement?.closest('.phone');
    if (!phone) return;
    const scrim = phone.querySelector('.modal-scrim');
    if (scrim.hidden) return;
    if (event.key === 'Escape') {event.preventDefault();closeModal(phone);}
    if (event.key === 'Tab') {
      const buttons = [...scrim.querySelectorAll('button')].filter(button => !button.disabled);
      const firstButton = buttons[0], lastButton = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === firstButton) {event.preventDefault();lastButton.focus();}
      if (!event.shiftKey && document.activeElement === lastButton) {event.preventDefault();firstButton.focus();}
    }
  });

  // Conservative enhancement: keep the CSS material on touch, WebKit and Firefox.
  // Matching the plan, only the background of selected floating controls is refracted.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const chromium = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent) && !/(?:Firefox|FxiOS|CriOS|EdgiOS)/.test(navigator.userAgent);
  const enhancementAllowed = () => chromium && finePointer.matches && !reducedMotion.matches && !reducedTransparency.matches && CSS.supports('backdrop-filter','url(#glass) blur(1px)');
  const enhanced = [];
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const filterRoot = document.createElementNS(svgNamespace,'svg');
  filterRoot.setAttribute('width','0');filterRoot.setAttribute('height','0');filterRoot.setAttribute('aria-hidden','true');
  filterRoot.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;';
  document.body.append(filterRoot);
  const defs = document.createElementNS(svgNamespace,'defs');
  filterRoot.append(defs);

  function updateGlass(entry) {
    const {element, filterImage, filterId} = entry;
    if (!enhancementAllowed()) {element.style.removeProperty('--glass-refraction');return;}
    const width = element.offsetWidth, height = element.offsetHeight;
    if (!width || !height) return;
    const size = `${width}x${height}`;
    if (entry.size !== size) {
      entry.size = size;
      const radius = Math.min(parseFloat(getComputedStyle(element).borderRadius)||30,height/2,width/2);
      const edge = Math.max(2,Math.min(width,height)*.035);
      // Derived from React Bits generateDisplacementMap: paired color gradients,
      // a neutral center and a softly curved transition at the perimeter.
      const displacement = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop stop-color="#0000"/><stop offset="1" stop-color="red"/></linearGradient><linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="#0000"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="${width}" height="${height}" fill="black"/><rect width="${width}" height="${height}" rx="${radius}" fill="url(#r)"/><rect width="${width}" height="${height}" rx="${radius}" fill="url(#b)" style="mix-blend-mode:difference"/><rect x="${edge}" y="${edge}" width="${Math.max(1,width-edge*2)}" height="${Math.max(1,height-edge*2)}" rx="${Math.max(0,radius-edge)}" fill="hsl(0 0% 50%)" style="filter:blur(4px)"/></svg>`;
      filterImage.setAttribute('href',`data:image/svg+xml,${encodeURIComponent(displacement)}`);
    }
    element.style.setProperty('--glass-refraction',`url(#${filterId})`);
  }
  root.querySelectorAll('[data-refraction]').forEach((element,index) => {
    const filterId = `preview-glass-${index}`;
    const filter = document.createElementNS(svgNamespace,'filter');
    filter.setAttribute('id',filterId);filter.setAttribute('x','0%');filter.setAttribute('y','0%');filter.setAttribute('width','100%');filter.setAttribute('height','100%');filter.setAttribute('color-interpolation-filters','sRGB');
    const filterImage = document.createElementNS(svgNamespace,'feImage');
    filterImage.setAttribute('x','0');filterImage.setAttribute('y','0');filterImage.setAttribute('width','100%');filterImage.setAttribute('height','100%');filterImage.setAttribute('preserveAspectRatio','none');filterImage.setAttribute('result','map');
    const displacement = document.createElementNS(svgNamespace,'feDisplacementMap');
    displacement.setAttribute('in','SourceGraphic');displacement.setAttribute('in2','map');displacement.setAttribute('scale','-16');displacement.setAttribute('xChannelSelector','R');displacement.setAttribute('yChannelSelector','B');
    filter.append(filterImage,displacement);defs.append(filter);
    const entry = {element,filterImage,filterId,size:null};
    enhanced.push(entry);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateGlass(entry));
      observer.observe(element);
      entry.observer = observer;
    }
    updateGlass(entry);
  });
  const refreshGlass = () => enhanced.forEach(updateGlass);
  reducedMotion.addEventListener('change',refreshGlass);
  reducedTransparency.addEventListener('change',refreshGlass);
  finePointer.addEventListener('change',refreshGlass);
  window.addEventListener('pagehide', () => {
    clearInterval(interval);
    enhanced.forEach(entry => entry.observer?.disconnect());
    phones.forEach(phone => clearTimeout(toastTimers.get(phone)));
  });

  // Query parameters make each approved scene directly reviewable.
  const query = new URLSearchParams(location.search);
  if (['compare','light','dark'].includes(query.get('view'))) setView(query.get('view'));
  if (['home','course','walking'].includes(query.get('scene'))) setScene(query.get('scene'));
})();
