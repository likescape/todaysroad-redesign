// Run against `npm run dev` on localhost:3000. Uses an isolated browser context.
// PLAYWRIGHT_MODULE_PATH may point at an already installed Playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const output = 'output/spot';
mkdirSync(output, { recursive: true });
const results = [], errors = [];
let browser;
const storyIds = locator => locator.evaluateAll(nodes => nodes.map(node => node.dataset.spotId));
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function checkControls(page, walking = false) {
  const controls = walking ? ['.walk-stories', '.walk-locate', '.walk-metrics', '.walk-stop', '.bottom-nav'] : ['.walk-start', '.course-locate', '.bottom-nav'];
  const boxes = await page.evaluate(selectors => selectors.map(selector => {
    const node = document.querySelector(selector), rect = node.getBoundingClientRect();
    const app = document.querySelector('.app').getBoundingClientRect();
    return { selector, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, app: { x: app.x, y: app.y, right: app.right, bottom: app.bottom } };
  }), controls);
  for (const box of boxes) assert.ok(box.x >= box.app.x && box.y >= box.app.y && box.right <= box.app.right + 1 && box.bottom <= box.app.bottom + 1, `${box.selector} is inside screen`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `${a.selector} overlaps ${b.selector}`);
  }
}
async function checkDetail(page, from, id) {
  const trigger = page.locator(`${from}[data-spot-id="${id}"]`);
  await trigger.click();
  await page.locator('.spot-detail').waitFor();
  const title = await page.locator('.spot-detail h2').innerText();
  assert.equal(await page.locator(`.spot-marker[data-spot-id="${id}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator(`.spot-row[data-spot-id="${id}"]`).last().getAttribute('aria-pressed'), 'true');
  await page.locator('.spot-sources summary').click();
  assert.ok((await page.locator('.spot-sources').innerText()).includes('확인일'));
  await page.locator('.spot-close').focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.querySelector('.spot-detail').contains(document.activeElement)), 'focus stays in topmost detail');
  }
  await page.keyboard.press('Escape');
  await page.locator('.spot-detail').waitFor({ state: 'detached' });
  assert.ok(await trigger.evaluate(node => node === document.activeElement), 'focus returns to initiating button');
  return title;
}
async function flow(viewport, colorScheme, name, full = false) {
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.setDefaultTimeout(20000);
  try {
    await page.goto('http://localhost:3000/?preview=spots');
    await page.waitForFunction(() => document.querySelectorAll('.course-stories .spot-row').length === 3 && document.querySelectorAll('.spot-marker').length === 3);
    await page.waitForTimeout(1900);
    const ids = await storyIds(page.locator('.course-stories .spot-row'));
    assert.equal(await page.locator('html').getAttribute('data-theme'), colorScheme);
    await checkControls(page);
    for (const id of ids) assert.ok(await page.locator(`.spot-marker[data-spot-id="${id}"]`).evaluate(node => {
      const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width/2, r.y + r.height/2));
    }), `${id} map marker can be clicked`);
    await page.screenshot({ path: `${output}/${name}-course.png` });
    await button(page, '경로 주변 이야기 3개 모두 보기').click();
    assert.deepEqual(await storyIds(page.locator('.spot-walk-list .spot-row')), ids);
    await button(page, '코스로 돌아가기').click();
    const title = await checkDetail(page, '.course-stories .spot-row', ids[0]);
    assert.equal(await checkDetail(page, '.spot-marker', ids[0]), title);
    await page.locator('.course-stories .spot-row').first().click();
    await page.screenshot({ path: `${output}/${name}-detail.png` });
    await page.locator('.spot-return').click();
    await button(page, '산책 시작').click();
    await page.locator('.app[data-walking="true"]').waitFor();
    await page.locator('.course-preview').waitFor({ state: 'detached' });
    await checkControls(page, true);
    await page.evaluate(() => { window.__spotNode = document.querySelector('.spot-marker'); window.__mapNode = document.querySelector('.map-root'); });
    await page.locator('.walk-stories').click();
    assert.deepEqual(await storyIds(page.locator('.spot-walk-list .spot-row')), ids, 'course-to-walk list is unchanged');
    await checkDetail(page, '.spot-walk-list .spot-row', ids[0]);
    assert.ok(await page.locator('.spot-walk-list').isVisible());
    await button(page, '산책으로 돌아가기').click();
    await page.locator('.spot-marker').first().click();
    const secondsBefore = await page.locator('.walk-metrics dd').first().textContent();
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    assert.notEqual(await page.locator('.walk-metrics dd').first().textContent(), secondsBefore, 'timer advances while detail is open');
    if (full) {
      await button(page, '커뮤니티').click();
      await page.getByRole('heading', { name: '커뮤니티', exact: true }).waitFor();
      await button(page, '내 산책').click();
      await button(page, '설정').click();
      await button(page, colorScheme === 'dark' ? '라이트 모드' : '다크 모드').click();
      await button(page, '뒤로 가기').click();
      await button(page, '홈').click();
      await page.locator('.walk-stories').click();
      assert.deepEqual(await storyIds(page.locator('.spot-walk-list .spot-row')), ids, 'tabs and theme keep active course spots');
      await button(page, '산책으로 돌아가기').click();
      assert.ok(await page.evaluate(() => window.__spotNode === document.querySelector('.spot-marker') && window.__mapNode === document.querySelector('.map-root')), 'map and marker nodes are retained');
    }
    await page.screenshot({ path: `${output}/${name}-walking.png` });
    await button(page, '산책 종료').click();
    await button(page, '산책 마치기').click();
    await button(page, '이 산책에 이야기 남기기').waitFor();
    assert.equal(await page.locator('.spot-marker').count(), 0);
    if (full) {
      await button(page, '이 산책에 이야기 남기기').click();
      await page.locator('textarea').fill('스팟 기능 검증: 산책 기록과 이야기 작성 흐름');
      assert.equal(await page.locator('select').inputValue(), 'private');
      await button(page, '나만의 이야기 저장').click();
      await page.getByText('스팟 기능 검증: 산책 기록과 이야기 작성 흐름', { exact: true }).waitFor();
      const data = await page.evaluate(() => JSON.parse(localStorage.getItem('todaysroad-journal-v1')));
      assert.ok(data.records.length > 3);
      assert.ok(data.records.every(record => !('spots' in record)));
      assert.equal(data.posts.find(post => post.body.includes('스팟 기능 검증')).visibility, 'private');
    }
    console.log(`PASS ${name}`);
    results.push({ name, passed: ['real-map-markers', 'controls', 'detail-source-focus', 'same-list-before-and-during-walk', 'timer', 'finish', ...(full ? ['tabs-settings-theme', 'record-community-private-post'] : [])] });
  } catch (error) { await page.screenshot({path: `${output}/failure-${typeof name === 'undefined' ? 'extra' : name}.png`}); throw error; } finally { await context.close(); }
}
async function extraFlows() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', permissions: ['geolocation'], geolocation: { latitude: 37.5472283676166, longitude: 126.933170665514 } });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://localhost:3000');
    await page.locator('.course-marker').first().waitFor();
    // A real geocoded place as simulated GPS input guarantees proximity at the origin,
    // without altering generation to go through spots or changing its random route.
    await button(page, '현재 위치로 이동').click();
    await page.waitForTimeout(900);
    await button(page, '코스 생성').click();
    await page.locator('.rp-tag').first().click();
    await button(page, '추천 받기').click();
    await page.locator('.course-stories').waitFor();
    const generatedIds = await storyIds(page.locator('.course-stories .spot-row'));
    assert.ok(generatedIds.includes('building-1015116771-approval'));
    await page.locator('.course-stories .spot-row').first().click(); await page.keyboard.press('Escape');
    await button(page, '산책 시작').click();
    await page.locator('.walk-stories').click();
    assert.deepEqual(await storyIds(page.locator('.spot-walk-list .spot-row')), generatedIds);
    await button(page, '산책으로 돌아가기').click();
    await button(page, '산책 종료').click(); await button(page, '산책 마치기').click();
    await button(page, '내 산책으로 돌아가기').click();
    await button(page, '홈').click();
    await button(page, '오늘의길 처음 화면으로 돌아가기').click();
    assert.equal(await page.locator('.spot-marker').count(), 0);
    await page.locator('.course-marker').first().click();
    await page.locator('.course-sheet').waitFor();
    assert.equal(await page.locator('.spot-detail').count(), 0);
    results.push({ name: 'generated-and-existing-courses', passed: ['generate-from-simulated-gps', 'generated-list-retained-on-start', 'detail-home-reset', 'select-existing-course'] });
    await page.goto('http://localhost:3000/dev/spots');
    await page.getByRole('button', { name: /산책길이 되기 전에는 철길/ }).click();
    await page.getByText('개발 전용 콘텐츠 미리보기 · 위치 미검증 · 지도에 표시하지 않아요', { exact: true }).waitFor();
    assert.equal(await page.locator('.spot-marker').count(), 0);
    await page.keyboard.press('Escape');
    await page.route('**/v2/maps/sdk.js?*', route => route.abort());
    await page.goto('http://localhost:3000/?preview=course');
    await page.locator('.map-fallback').waitFor();
    await page.locator('.spot-empty').waitFor();
    await button(page, '산책 시작').click();
    await page.locator('.walk-stories').click();
    await page.locator('.spot-walk-list .spot-empty').waitFor();
    await button(page, '산책으로 돌아가기').click();
    await button(page, '산책 종료').click(); await button(page, '산책 마치기').click();
    await button(page, '이 산책에 이야기 남기기').waitFor();
    await page.goto('http://localhost:3000/?preview=spots');
    await page.locator('.course-stories .spot-row').first().click();
    await page.locator('.spot-detail').waitFor(); await page.keyboard.press('Escape');
    await button(page, '산책 시작').click(); await page.locator('.walk-stories').click();
    assert.equal(await page.locator('.spot-walk-list .spot-row').count(), 3);
    results.push({ name: 'data-and-sdk-limits', passed: ['unlocated-catalog', 'zero-spots', 'SDK-failure-course-walk-finish', 'SDK-failure-story-list-detail'] });
  } catch (error) { await page.screenshot({path: `${output}/failure-${typeof name === 'undefined' ? 'extra' : name}.png`}); throw error; } finally { await context.close(); }
}
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    await flow({ width: 390, height: 844 }, 'light', 'mobile-light', true);
    await flow({ width: 390, height: 844 }, 'dark', 'mobile-dark');
    await flow({ width: 1440, height: 1000 }, 'light', 'desktop-light');
    await flow({ width: 1440, height: 1000 }, 'dark', 'desktop-dark', true);
    await flow({ width: 1280, height: 720 }, 'light', 'scaled-desktop');
    await flow({ width: 320, height: 640 }, 'dark', 'small-mobile');
    await extraFlows();
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); writeFileSync(`${output}/browser-verification.json`, JSON.stringify({ results, errors }, null, 2)); }
  console.log(JSON.stringify({ results, errors }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
