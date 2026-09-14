const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runInNewContext } = require("node:vm");
const { join } = require("node:path");
const { parseThemePreference, resolveTheme, themeInitScript, THEME_MEDIA_QUERY, THEME_STORAGE_KEY } = require(join(process.env.JOURNAL_TEST_BUILD, "theme.js"));

test("theme defaults to the device and rejects unknown saved preferences", () => {
  for (const value of [null, "", "system", "invalid"]) assert.equal(parseThemePreference(value), "system");
  for (const value of ["light", "dark"]) assert.equal(parseThemePreference(value), value);
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("explicit appearance overrides either device setting", () => {
  for (const preference of ["light", "dark"]) {
    for (const systemDark of [true, false]) assert.equal(resolveTheme(preference, systemDark), preference);
  }
});

function firstPaint(saved, systemDark, blocked = false) {
  const document = { documentElement: { dataset: {} } };
  runInNewContext(themeInitScript, {
    document,
    localStorage: { getItem(key) { assert.equal(key, THEME_STORAGE_KEY); if (blocked) throw new Error("Storage blocked"); return saved; } },
    matchMedia(query) { assert.equal(query, THEME_MEDIA_QUERY); return { matches: systemDark }; },
  });
  return document.documentElement.dataset.theme;
}

test("first paint matches the saved preference before React starts", () => {
  for (const saved of [null, "light", "dark", "system", "invalid"]) {
    for (const systemDark of [true, false]) {
      assert.equal(firstPaint(saved, systemDark), resolveTheme(parseThemePreference(saved), systemDark));
    }
  }
});

test("blocked storage still renders the device appearance on first paint", () => {
  assert.equal(firstPaint(null, true, true), "dark");
  assert.equal(firstPaint(null, false, true), "light");
});
