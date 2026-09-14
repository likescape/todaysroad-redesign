const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const load = file => require(join(process.env.JOURNAL_TEST_BUILD, file));
const { parseSegmentation } = load('map-segmentation.js');
const { planImageRoute, crossesObstacle, distanceMeters, createImageRouteTrace } = load('image-route-planner.js');
const { courseFromImagePlan, generateImageCourse } = load('recommend.js');
const { mapTileUrl } = load('map-tile.js');
const { analyzeMapImage } = load('map-vision.js');
const { readLimitedBody } = load('server-http.js');

function fixture() {
  const nodes = [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 800, y: 100 }, { id: 'c', x: 800, y: 800 }, { id: 'd', x: 100, y: 800 }];
  const roads = nodes.map((n, i) => ({ id: `r${i}`, from: n.id, to: nodes[(i+1)%4].id, kind: 'footpath', confidence: .95, points: [n, nodes[(i+1)%4]] }));
  const features = [
    { id: 'park', kind: 'greenery', category: 'park', label: '테스트 공원', point: { x: 810, y: 110 }, outline: [{x:810,y:110},{x:870,y:110},{x:870,y:190},{x:810,y:190}], confidence: .95, accessNodeId: 'b' },
    { id: 'cafe', kind: 'icon', category: 'cafe', label: '테스트 카페', point: { x: 810, y: 810 }, outline: [], confidence: .95, accessNodeId: 'c' },
  ];
  return { version: 1, nodes, roads, features };
}
function snapshot(lat = 37.5, lng = 127) {
  const toLatLng = p => ({ lat: lat + (500 - p.y) / 111195, lng: lng + (p.x - 500) / (111195 * Math.cos(lat * Math.PI / 180)) });
  return { image: 'data:image/png;base64,test', origin: toLatLng({ x:100,y:100 }), originPixel: {x:100,y:100}, toLatLng, capturedAt: '2026-09-09T00:00:00Z', level: 4 };
}
const prefs = { minutes: 30, tags: ['nature', 'cafe'] };
const isError = code => error => error.code === code;

test('connects category waypoints along recognized roads and returns to the same road start nationwide', () => {
  for (const [lat, lng] of [[37.5,127], [35.1,129], [33.5,126.5]]) {
    const data = parseSegmentation(fixture()), snap = snapshot(lat,lng), plan = planImageRoute(data,snap,{...prefs,minutes:60});
    assert.deepEqual(plan.path[0], plan.path.at(-1));
    assert.deepEqual(plan.waypoints.map(w=>w.featureId).sort(), ['cafe','park']);
    for (const w of plan.waypoints) assert.ok(plan.path.some(p=>distanceMeters(p,w.point)<.01));
    assert.ok(plan.distanceMeters > 2700 && plan.distanceMeters < 2900);
    const actual = plan.path.slice(1).reduce((sum,p,i)=>sum+distanceMeters(plan.path[i],p),0);
    assert.ok(Math.abs(actual-plan.distanceMeters)<.001);
  }
});

test('ignores motorway, uncertain roads, disconnected candidates, and low-confidence icons', () => {
  const data = fixture(); data.roads[1].kind='motorway'; data.roads[2].confidence=.2; data.features[0].confidence=.2;
  assert.throws(()=>planImageRoute(parseSegmentation(data),snapshot(),prefs), isError('NO_WAYPOINTS'));
});

test('a building or water strip crossing a road excludes that edge even between vertices', () => {
  for (const kind of ['water','building']) {
    const data=fixture(); data.roads=data.roads.slice(0,1);
    data.features.push({id:'block',kind,category:kind,label:'장애물',point:{x:400,y:100},outline:[{x:400,y:90},{x:400.1,y:90},{x:400.1,y:110},{x:400,y:110}],confidence:.2,accessNodeId:null});
    assert.equal(crossesObstacle(data.roads[0].points,[data.features.at(-1)]),true);
    assert.throws(()=>planImageRoute(parseSegmentation(data),snapshot(),prefs),isError('NO_ROADS'));
  }
});

test('roads crossing geometrically never create a new junction', () => {
  const data=fixture(); data.roads=data.roads.slice(0,1);
  data.nodes.push({id:'e',x:400,y:0},{id:'f',x:400,y:800});
  data.roads.push({id:'bridge',from:'e',to:'f',kind:'footpath',confidence:.99,points:[data.nodes[4],data.nodes[5]]});
  data.features=[{...data.features[1],point:{x:405,y:795},accessNodeId:'f'}];
  assert.throws(()=>planImageRoute(parseSegmentation(data),snapshot(),{minutes:30,tags:['cafe']}),isError('NO_WAYPOINTS'));
});

test('origin snaps to a road without drawing an off-road connector', () => {
  const snap=snapshot(); snap.originPixel={x:350,y:120}; snap.origin=snap.toLatLng(snap.originPixel);
  const plan=planImageRoute(parseSegmentation(fixture()),snap,prefs);
  assert.ok(plan.startOffsetMeters >19 && plan.startOffsetMeters<21);
  assert.equal(plan.pixels[0].y,100); assert.equal(plan.pixels[0].x,350);
  assert.notDeepEqual(plan.path[0],snap.origin);
  snap.originPixel={x:500,y:500};snap.origin=snap.toLatLng(snap.originPixel);
  const trace = createImageRouteTrace();
  assert.throws(()=>planImageRoute(parseSegmentation(fixture()),snap,prefs,undefined,trace),isError('START_NOT_ON_ROAD'));
  assert.ok(trace.nearestRoad.offsetMeters > 60);
  const selectedPixel = trace.nearestRoad.pixel;
  const selectedStart = {...snap, originPixel:selectedPixel, origin:snap.toLatLng(selectedPixel)};
  const selectedPlan = planImageRoute(parseSegmentation(fixture()),selectedStart,prefs);
  assert.deepEqual(selectedPlan.pixels[0],selectedPixel);
  assert.ok(selectedPlan.startOffsetMeters < .01);
});

test('flat preference excludes steps and missing categories stay explicit', () => {
  const data=fixture(); data.roads.forEach(r=>r.kind='steps');
  assert.throws(()=>planImageRoute(parseSegmentation(data),snapshot(),{minutes:30,tags:['flat']}),isError('NO_ROADS'));
  const plan=planImageRoute(parseSegmentation(fixture()),snapshot(),{minutes:30,tags:['nature','river']});
  assert.deepEqual(plan.unmatchedTags,['river']);
  const course=courseFromImagePlan(snapshot(),{minutes:30,tags:['nature','river']},plan);
  assert.ok(!course.title.includes('강변'));
  assert.ok(course.imageAnalysis.notes.some(note=>note.includes('강변')));
  assert.equal(course.duration,`${plan.durationMinutes}분`);
});

test('short routes show actual duration and retracing instead of stretching geometry', () => {
  const data=fixture(); data.roads=data.roads.slice(0,1);data.features=data.features.slice(0,1);
  const snap=snapshot(), request={minutes:90,tags:['nature']};
  const plan=planImageRoute(parseSegmentation(data),snap,request), course=courseFromImagePlan(snap,request,plan);
  assert.ok(plan.retraces); assert.equal(course.duration,'21분');
  assert.ok(course.imageAnalysis.notes.some(note=>note.includes('희망 90분')));
});

test('rejects malformed, oversized and invented graph references', () => {
  for (const change of [d=>d.nodes[0].x=NaN,d=>d.nodes[0].x=1001,d=>d.nodes[1].id='a',d=>d.roads[0].to='missing',d=>d.roads[0].points=[{x:400,y:400},{x:800,y:100}],d=>d.features[0].accessNodeId='missing',d=>d.features[0].outline=[],d=>d.roads[0].confidence=1.1,d=>d.nodes=Array(301).fill(d.nodes[0])]) {
    const data=fixture();change(data);assert.throws(()=>parseSegmentation(data),isError('INVALID_SEGMENTATION'));
  }
});

test('tile relay rejects arbitrary hosts, credentials, ports, paths, redirects and queries', () => {
  const path='/api/v1/tile/PNG02/v22_ydigb/latest/4/995/437.png';
  assert.equal(mapTileUrl(`http://mts.daumcdn.net${path}`),`https://mts.daumcdn.net${path}`);
  for(const url of [`https://mts.daumcdn.net.evil.test${path}`,`https://user:pass@mts.daumcdn.net${path}`,`https://mts.daumcdn.net:8080${path}`,`https://127.0.0.1${path}`,`file://${path}`,`https://mts.daumcdn.net${path}?redirect=1`,`https://mts.daumcdn.net/secret`,`https://mts.daumcdn.net${path}#fragment`]) assert.equal(mapTileUrl(url),null);
});

test('bounded body reader stops streamed payloads over the limit', async () => {
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));c.close();}});
  await assert.rejects(()=>readLimitedBody(body,10),/BODY_TOO_LARGE/);
});

test('pipeline consumes the actual snapshot and emits all seven steps', async t => {
  const steps=[], requests=[];
  t.mock.method(global,'fetch',async (url, options)=>{requests.push([url,options]);return Response.json(options?.method==='POST'?{segmentation:fixture()}:{available:true});});
  const course=await generateImageCourse(async()=>snapshot(),prefs,s=>steps.push(s),new AbortController().signal);
  assert.deepEqual(steps,[1,2,3,4,5,6,7]);
  assert.equal(JSON.parse(requests[1][1].body).image,snapshot().image);
  assert.ok(course.path.length>2);assert.equal(course.imageAnalysis.segmentation.features.length,2);
});

test('missing API setup fails before GPS or snapshot; cancellation cannot create a course', async t => {
  let captured=false;
  t.mock.method(global,'fetch',async()=>Response.json({code:'VISION_NOT_CONFIGURED',error:'설정 필요'},{status:503}));
  await assert.rejects(()=>generateImageCourse(async()=>{captured=true;return snapshot()},prefs,()=>{},new AbortController().signal),isError('VISION_NOT_CONFIGURED'));
  assert.equal(captured,false);
  t.mock.restoreAll();
  t.mock.method(global,'fetch',async()=>Response.json({available:true}));
  const controller=new AbortController();
  await assert.rejects(()=>generateImageCourse(async()=>{controller.abort();return snapshot()},prefs,()=>{},controller.signal),e=>e.name==='AbortError');
});

test('vision adapter sends image-only evidence with strict schema and rejects partial/refused output', async t => {
  let payload;
  t.mock.method(global,'fetch',async(_,options)=>{payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixture())}]}]});});
  const result=await analyzeMapImage('data:image/png;base64,test','test-only','test-model',new AbortController().signal);
  assert.equal(result.version,1);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
  assert.equal(payload.input[0].content[1].image_url,'data:image/png;base64,test');
  t.mock.restoreAll();
  t.mock.method(global,'fetch',async()=>Response.json({status:'incomplete',output:[]}));
  await assert.rejects(()=>analyzeMapImage('image','test','model',new AbortController().signal),isError('VISION_INCOMPLETE'));
  t.mock.restoreAll();
  t.mock.method(global,'fetch',async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No analysis'}]}]}));
  await assert.rejects(()=>analyzeMapImage('image','test','model',new AbortController().signal),isError('VISION_REFUSED'));
});


test('step trace reports the actual exclusions and reachable candidates, including failure', () => {
  const trace = createImageRouteTrace();
  const data = fixture();
  data.roads[2].kind = 'unknown';
  const plan = planImageRoute(parseSegmentation(data), snapshot(), prefs, undefined, trace);
  assert.equal(trace.step, 7);
  assert.equal(trace.targetMeters, 2000);
  assert.deepEqual(trace.excludedRoads, [{ id: 'r2', reason: '길 유형 불명확' }]);
  assert.ok(!trace.acceptedRoadIds.includes('r2'));
  assert.ok(plan.waypoints.every(w => trace.candidateFeatureIds.includes(w.featureId)));
  const failed = createImageRouteTrace();
  data.roads.forEach(r => r.kind = 'unknown');
  assert.throws(() => planImageRoute(parseSegmentation(data), snapshot(), prefs, undefined, failed), isError('NO_ROADS'));
  assert.equal(failed.step, 3);
  assert.equal(failed.excludedRoads.length, data.roads.length);
});
