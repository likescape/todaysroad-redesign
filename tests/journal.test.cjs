const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const journal = require(join(process.env.JOURNAL_TEST_BUILD, "journal.js"));
const { PREVIEW_COURSE, splitWalkPath } = require(join(process.env.JOURNAL_TEST_BUILD, "walk.js"));
const draft = (overrides = {}) => ({ body: "오늘 만난 산책길", photos: [], course: null, visibility: "public", ...overrides });

test("ending early records elapsed time, partial distance, and only the completed route", () => {
  const start = Date.parse("2026-09-08T00:00:00Z");
  const record = journal.createWalkRecord(PREVIEW_COURSE, start, start + 900000);
  assert.equal(record.seconds, 900);
  assert.equal(record.distance, 1);
  assert.deepEqual(record.path, splitWalkPath(PREVIEW_COURSE.path, 0.5).completed);
  assert.notDeepEqual(record.path.at(-1), PREVIEW_COURSE.path.at(-1));
});

test("long walks retain elapsed time but never exceed the simulated route distance", () => {
  const record = journal.createWalkRecord(PREVIEW_COURSE, 0, 3600000);
  assert.equal(record.distance, 2);
  assert.equal(record.seconds, 3600);
  assert.deepEqual(record.path, PREVIEW_COURSE.path);
});

test("zero-length and missing routes produce finite display values", () => {
  const record = journal.createWalkRecord({ ...PREVIEW_COURSE, path: undefined }, 1000, 1000);
  assert.equal(record.distance, 0);
  assert.deepEqual(record.path, []);
  assert.equal(journal.formatPace(record), "—");
  assert.equal(journal.formatDuration(0), "0초");
  assert.deepEqual(journal.routeDrawing([{ lat: 1, lng: 1 }, { lat: 1, lng: 1 }]), [{ x: 170, y: 95 }, { x: 170, y: 95 }]);
});

test("saved photos and route coordinates survive serialization and independent record edits", () => {
  const data = journal.initialJournal();
  const record = structuredClone(data.records[2]);
  const course = journal.attachCourse(record);
  const next = journal.savePost(data, draft({ course, photos: record.photos }));
  const restored = journal.parseJournal(JSON.stringify(next));
  assert.deepEqual(restored.posts[0].photos, record.photos);
  assert.deepEqual(restored.posts[0].course, course);
  record.path[0].lat = 0;
  assert.notEqual(course.path[0].lat, 0);
});

test("own posts can be edited and deleted without changing original walk records", () => {
  const data = journal.initialJournal();
  const added = journal.savePost(data, draft({ course: journal.attachCourse(data.records[0]) }), "2026-09-08T01:00:00Z");
  const post = added.posts[0];
  const edited = journal.savePost(added, draft({ id: post.id, body: "수정한 이야기", photos: data.records[2].photos, visibility: "private" }), "2026-09-08T02:00:00Z");
  assert.equal(edited.posts[0].body, "수정한 이야기");
  assert.equal(edited.posts[0].createdAt, post.createdAt);
  assert.equal(edited.posts[0].updatedAt, "2026-09-08T02:00:00Z");
  assert.equal(edited.posts[0].course, null);
  assert.equal(edited.posts[0].photos.length, 1);
  const deleted = journal.deletePost(edited, post.id);
  assert.deepEqual(deleted.posts, data.posts);
  assert.deepEqual(deleted.records, data.records);
});

test("other authors' posts cannot be edited or deleted, including unknown IDs", () => {
  const data = journal.initialJournal();
  assert.throws(() => journal.savePost(data, draft({ id: data.posts[0].id })), /내가 작성한/);
  assert.throws(() => journal.deletePost(data, data.posts[0].id), /내가 작성한/);
  assert.throws(() => journal.savePost(data, draft({ id: "missing" })), /내가 작성한/);
  assert.throws(() => journal.deletePost(data, "missing"), /내가 작성한/);
});

test("private stories are excluded from the public feed and visible in My stories", () => {
  const data = journal.savePost(journal.initialJournal(), draft({ visibility: "private" }));
  assert.ok(!journal.visiblePosts(data.posts, false).some(p => p.id === data.posts[0].id));
  assert.equal(journal.visiblePosts(data.posts, true).length, 1);
  assert.equal(journal.visiblePosts(data.posts, true)[0].id, data.posts[0].id);
});

test("stories started from a new walk attach the route and save privately without changing the record", () => {
  const record = journal.createWalkRecord(PREVIEW_COURSE, 0, 900000);
  const initial = journal.createPostDraft(record);
  assert.equal(initial.body, "");
  assert.deepEqual(initial.photos, []);
  assert.equal(initial.visibility, "private");
  assert.deepEqual(initial.course, journal.attachCourse(record));
  const data = { ...journal.initialJournal(), records: [record] };
  const saved = journal.parseJournal(JSON.stringify(journal.savePost(data, { ...initial, body: "나만 간직할 오늘의 산책" })));
  assert.deepEqual(saved.records, [record]);
  assert.ok(!journal.visiblePosts(saved.posts, false).some(post => post.body === "나만 간직할 오늘의 산책"));
  assert.equal(journal.visiblePosts(saved.posts, true)[0].body, "나만 간직할 오늘의 산책");
});

test("legacy notes and photos remain available in the unified composer without being made public", () => {
  const restored = journal.parseJournal(JSON.stringify(journal.initialJournal()));
  const record = restored.records[2];
  const initial = journal.createPostDraft(record);
  assert.equal(initial.body, record.note);
  assert.deepEqual(initial.photos, record.photos);
  assert.equal(initial.visibility, "private");
});

test("community drafts start public and editing retains the saved story's visibility and removed course", () => {
  assert.deepEqual(journal.createPostDraft(), draft({ body: "" }));
  const data = journal.savePost(journal.initialJournal(), draft({ visibility: "private" }));
  const post = data.posts[0];
  const edit = journal.createPostDraft(data.records[0], post);
  assert.deepEqual(edit, { id: post.id, body: post.body, photos: post.photos, course: null, visibility: "private" });
});

test("feed is newest first and empty My stories is supported", () => {
  const data = journal.initialJournal();
  assert.deepEqual(journal.visiblePosts(data.posts, true), []);
  const sorted = journal.visiblePosts([...data.posts].reverse(), false);
  assert.equal(sorted[0].id, data.posts[0].id);
});

test("blank or oversized bodies and excess attachments are rejected", () => {
  const data = journal.initialJournal();
  assert.throws(() => journal.savePost(data, draft({ body: "  \n " })), /2,000/);
  assert.throws(() => journal.savePost(data, draft({ body: "a".repeat(2001) })), /2,000/);
  assert.throws(() => journal.savePost(data, draft({ photos: Array(6).fill(data.records[2].photos[0]) })), /5장/);
});

test("corrupted storage, invalid coordinates, and unsafe image sources are rejected", () => {
  assert.throws(() => journal.parseJournal("invalid"));
  assert.throws(() => journal.parseJournal('{"version":2}'));
  const badRoute = structuredClone(journal.initialJournal());
  badRoute.records[0].path[0].lat = 200;
  assert.throws(() => journal.parseJournal(JSON.stringify(badRoute)));
  const badPhoto = structuredClone(journal.initialJournal());
  badPhoto.records[2].photos[0].src = "javascript:alert(1)";
  assert.throws(() => journal.parseJournal(JSON.stringify(badPhoto)));
});
