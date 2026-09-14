/* Uses the original local preview renderer; comparison controls stay synchronized. */
(() => {
  'use strict';
  const root = document.getElementById('glass-preview');
  const phones = [...root.querySelectorAll('.phone')];
  const materials = { clear: { light: 62, dark: 64 }, regular: { light: 76, dark: 80 }, dense: { light: 90, dark: 92 } };
  const query = new URLSearchParams(location.search);
  let scene = query.get('screen') === 'story' ? 'story' : 'course';
  let mode = query.get('theme') === 'dark' ? 'dark' : 'light';

  phones.forEach(phone => {
    // All preview interactions happen in the comparison toolbar, outside the phones.
    phone.dataset.state = 'course';
    phone.querySelector('.material-story')?.remove();
    const panel = document.createElement('div');
    panel.className = 'material-story';
    panel.innerHTML = `
      <section class="material-story-panel glass">
        <span class="material-story-handle"></span>
        <div class="material-story-heading"><h3>창고 관리인의 꿈에<br>나타난 왕</h3><span class="close-dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg></span></div>
        <p class="material-story-place"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>공민왕 사당</p>
        <p class="material-story-kind">동네 이야기 · 전해지는 이야기</p>
        <p class="material-story-summary">창고를 지키던 이의 꿈에 공민왕이 나타나 자신을 기리는 사당을 지어 달라고 했다는 이야기가 전해져요.</p>
        <p class="material-story-copy">공민왕 사당에 얽힌 전승이에요.</p>
        <p class="material-story-copy">서울시 시민기자 기사가 소개한 전승으로, 꿈과 사당 건립의 인과관계를 역사적 사실로 확인한 것은 아니에요. 장소에 얽힌 이야기를 가볍게 읽어 보세요.</p>
        <aside class="material-story-observation">익숙한 골목에서 잠시 멈춰, 이 장소에 전해지는 이야기를 떠올려 보세요.</aside>
        <div class="material-story-source"><span>출처와 장소 정보</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></div>
        <div class="primary-button">이야기 닫기</div>
      </section>`;
    phone.append(panel);
    // Labels describe the whole static mockup; decorative controls are not focusable.
    phone.querySelectorAll('button, a').forEach(node => { node.tabIndex = -1; });
  });

  function fit() {
    const grid = root.querySelector('.material-grid');
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const widthScale = (grid.clientWidth - gap * 2) / (390 * 3);
    const top = grid.getBoundingClientRect().top + window.scrollY;
    const heightScale = (window.innerHeight - top - 183) / 844;
    const scale = Math.min(.88, widthScale, window.innerWidth >= 800 ? Math.max(.48, heightScale) : widthScale);
    root.style.setProperty('--material-scale', String(Math.max(.1, scale)));
  }

  function render(updateURL = true) {
    root.dataset.mode = mode;
    root.dataset.materialScene = scene;
    phones.forEach(phone => {
      phone.dataset.theme = mode;
      const name = phone.dataset.material;
      phone.setAttribute('aria-label', `${name} 재질 · ${mode === 'light' ? '라이트' : '다크'} · ${scene === 'story' ? '이야기 상세' : '코스 확인'} 화면 시안`);
      phone.closest('.material-column').querySelector('[data-alpha]').textContent = `${materials[name][mode]}%`;
    });
    root.querySelectorAll('button[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    root.querySelectorAll('button[data-material-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.materialScene === scene)));
    document.getElementById('preview-announcement').textContent = `${mode === 'light' ? '라이트' : '다크'} 모드, ${scene === 'story' ? '이야기 상세' : '코스 확인'} 화면의 Clear, Regular, Dense 재질 비교`;
    if (updateURL && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.search = '';
      url.searchParams.set('screen', scene);
      url.searchParams.set('theme', mode);
      history.replaceState(null, '', url);
    }
    fit();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-mode')) mode = button.dataset.mode;
    else if (button.hasAttribute('data-material-scene')) scene = button.dataset.materialScene;
    else return;
    render();
  });
  window.addEventListener('resize', fit, { passive: true });
  document.fonts.ready.then(fit);
  render(false);
})();
