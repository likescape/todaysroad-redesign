const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { nearestRoutePosition, selectCourseSpots, attachCourseSpots, resolveCourseSpots, seoulDate } = require(join(process.env.JOURNAL_TEST_BUILD, 'spots.js'));
const { SPOT_CATALOG } = require(join(process.env.JOURNAL_TEST_BUILD, 'spot-content.js'));
const { SPOT_PREVIEW_COURSE } = require(join(process.env.JOURNAL_TEST_BUILD, 'spot-preview.js'));
const { PREVIEW_COURSE } = require(join(process.env.JOURNAL_TEST_BUILD, 'walk.js'));
const { createWalkRecord } = require(join(process.env.JOURNAL_TEST_BUILD, 'journal.js'));
const today = '2026-09-09';
// Synthetic equatorial coordinates belong only to tests, never to real places.
const route = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }];
const evidence = [{ publisher: 'Test fixture', url: 'https://example.org', sourceFile: 'test', sourceId: 'test', checkedOn: today, asOf: today, limitations: [] }];
function candidate(id, lat, lng, category = 'building') {
  return {
    place: { id: `place-${id}`, name: `Example ${id}`, point: lat === null ? null : { lat, lng }, geometry: 'point', location: { status: 'verified', evidence } },
    story: { id, placeId: `place-${id}`, title: id, category, claimKind: 'fact', review: 'approved', storyKey: id, evidence },
  };
}
const catalog = (...items) => ({ places: items.map(item => item.place), stories: items.map(item => item.story) });
const ids = result => result.map(item => item.spotId);

test('includes a point near a segment midpoint but far from the start and vertices', () => {
  const result = selectCourseSpots(route, catalog(candidate('midpoint', .0004, .005)), today);
  assert.deepEqual(ids(result), ['midpoint']);
  assert.ok(result[0].distanceMeters > 44 && result[0].distanceMeters < 45);
  assert.ok(result[0].progressMeters > 555 && result[0].progressMeters < 557);
});

test('checks every segment and uses the earliest passage at a self-intersection', () => {
  const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: .01 }, { lat: .01, lng: .01 }, { lat: 0, lng: 0 }];
  const nearSecond = nearestRoutePosition({ lat: .005, lng: .0101 }, path);
  assert.ok(nearSecond.distanceMeters < 12);
  assert.ok(nearSecond.progressMeters > 1667);
  assert.equal(nearestRoutePosition(path[0], path).progressMeters, 0);
});

test('rejects unverified, absent, invalid, out-of-radius and non-point locations and unreviewed stories', () => {
  const unverified = candidate('unverified', 0, .005); unverified.place.location.status = 'unverified';
  const area = candidate('area', 0, .005); area.place.geometry = 'area';
  const segment = candidate('segment', 0, .005); segment.place.geometry = 'segment';
  const held = candidate('held', 0, .005); held.story.review = 'held';
  const noEvidence = candidate('no-evidence', 0, .005); noEvidence.story.evidence = [];
  const noLocationEvidence = candidate('no-location-evidence', 0, .005); noLocationEvidence.place.location.evidence = [];
  assert.deepEqual(selectCourseSpots(route, catalog(unverified, area, segment, held, noEvidence, noLocationEvidence, candidate('none', null), candidate('invalid', NaN, 0), candidate('far', .001, .005)), today), []);
});

test('radius is configurable without fabricating extra spots, including boundary behaviour', () => {
  const item = candidate('edge', 100 / 111195, .005);
  assert.equal(selectCourseSpots(route, catalog(item), today).length, 1);
  assert.equal(selectCourseSpots(route, catalog(item), today, { radiusMeters: 99 }).length, 0);
  assert.deepEqual(selectCourseSpots(route, catalog(item), today, { maxCount: 0 }), []);
});

test('deduplicates a place, a repeated ID and nearby retellings of one story', () => {
  const a = candidate('a', 0, .002), samePlace = candidate('b', 0, .002), sameStory = candidate('c', 0, .0021);
  samePlace.story.placeId = a.place.id;
  sameStory.story.storyKey = a.story.storyKey;
  const result = selectCourseSpots(route, catalog(a, samePlace, sameStory, a), today);
  assert.deepEqual(ids(result), ['a']);
});

test('selects at most three, favours diverse eligible subjects and then orders by route direction', () => {
  const items = [candidate('a', 0, .001), candidate('b', 0, .003), candidate('c', .0001, .008, 'history'), candidate('d', .0002, .006, 'change'), candidate('outside', .02, .002, 'culture')];
  const result = selectCourseSpots(route, catalog(...items), today, { maxCount: 9 });
  assert.deepEqual(ids(result), ['a', 'd', 'c']);
  assert.deepEqual(result.map(item => item.order), [1, 2, 3]);
  assert.ok(result.every((item, i) => i === 0 || item.progressMeters >= result[i-1].progressMeters));
  assert.deepEqual(ids(selectCourseSpots([...route].reverse(), catalog(...items), today)), ['c', 'd', 'b']);
});

test('ties use stable IDs and yield the same result with shuffled source order', () => {
  const items = ['d', 'c', 'a', 'b'].map(id => candidate(id, 0, .005));
  const expected = selectCourseSpots(route, catalog(...items), today);
  assert.deepEqual(ids(expected), ['a', 'b', 'c']);
  for (const shuffled of [[...items].reverse(), [items[1], items[3], items[0], items[2]], items]) {
    assert.deepEqual(selectCourseSpots(route, catalog(...shuffled), today), expected);
  }
});

test('empty, missing, single-point, degenerate and invalid routes are safe', () => {
  for (const path of [[], [route[0]], [route[0], route[0]], [route[0], { lat: Infinity, lng: 0 }]]) {
    assert.deepEqual(selectCourseSpots(path, catalog(candidate('a', 0, 0)), today), []);
  }
  assert.equal(nearestRoutePosition({ lat: 0, lng: .005 }, [route[0], route[0], route[1]]).distanceMeters, 0);
  assert.deepEqual(attachCourseSpots({ ...PREVIEW_COURSE, path: undefined }, SPOT_CATALOG, today).spots, []);
  assert.deepEqual(resolveCourseSpots(PREVIEW_COURSE, SPOT_CATALOG), []);
  assert.deepEqual(resolveCourseSpots({ ...PREVIEW_COURSE, spots: [{ spotId: 'removed' }] }, SPOT_CATALOG), []);
});

test('event dates use injected day, inclusive 30-day lead and end date; malformed dates are excluded', () => {
  const event = candidate('event', 0, .005, 'culture');
  event.story.claimKind = 'event'; event.story.event = { startsOn: '2026-11-29', endsOn: '2026-11-29' };
  for (const [asOf, count] of [['2026-09-09', 0], ['2026-10-29', 0], ['2026-10-30', 1], ['2026-11-29', 1], ['2026-11-30', 0], ['invalid', 0]]) {
    assert.equal(selectCourseSpots(route, catalog(event), asOf).length, count, asOf);
  }
  for (const dates of [undefined, { startsOn: '2026-02-30', endsOn: '2026-03-05' }, { startsOn: '2026-11-29', endsOn: '2026-11-28' }]) {
    event.story.event = dates; assert.deepEqual(selectCourseSpots(route, catalog(event), today), []);
  }
  assert.equal(seoulDate(new Date('2026-09-08T15:00:00Z')), '2026-09-09');
});

test('curated locations require review evidence and unresolved park/site cannot appear on a course', () => {
  assert.equal(SPOT_CATALOG.places.filter(place => place.location.status === 'verified').length, 3);
  for (const place of SPOT_CATALOG.places) {
    if (place.location.status === 'verified') {
      assert.ok(place.point); assert.ok(place.location.evidence.length); assert.ok(place.location.limitations.length);
    } else assert.equal(place.point, null);
  }
  const selected = attachCourseSpots(SPOT_PREVIEW_COURSE, SPOT_CATALOG, today);
  assert.equal(selected.spots.length, 3);
  assert.equal(selected.path, SPOT_PREVIEW_COURSE.path);
  assert.deepEqual(ids(selected.spots).sort(), ['building-1015116771-approval', 'gongmin-local-legend', 'gwangheungdang-building']);
  assert.equal(attachCourseSpots(PREVIEW_COURSE, SPOT_CATALOG, today).spots.length, 0);
});

test('completed records do not acquire spot visit history or alter the prepared course snapshot', () => {
  const course = attachCourseSpots(SPOT_PREVIEW_COURSE, SPOT_CATALOG, today);
  const links = structuredClone(course.spots);
  const record = createWalkRecord(course, 0, 90000);
  assert.equal('spots' in record, false);
  assert.deepEqual(course.spots, links);
});
