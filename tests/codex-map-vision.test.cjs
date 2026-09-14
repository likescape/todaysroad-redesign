const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, rm, access } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, dirname } = require('node:path');
const { analyzeMapWithCodex, codexAvailable } = require(join(process.env.JOURNAL_TEST_BUILD, 'codex-map-vision.js'));

async function fakeCli(t, script) {
  const directory = await mkdtemp(join(tmpdir(), 'todaysroad-fake-cli-'));
  const executable = join(directory, 'fake-codex');
  await writeFile(executable, `#!${process.execPath}\n${script}`, { mode: 0o700 });
  const old = process.env.CODEX_BIN;
  process.env.CODEX_BIN = executable;
  t.after(async () => { if (old === undefined) delete process.env.CODEX_BIN; else process.env.CODEX_BIN = old; await rm(directory, { recursive: true, force: true }); });
  return directory;
}

test('local CLI receives literal image/schema arguments, validates its result and deletes temporary data', async t => {
  const directory = await fakeCli(t, `
    const fs = require('node:fs'); const args = process.argv.slice(2);
    if (args[0] === 'login') process.exit(0);
    const value = key => args[args.indexOf(key) + 1];
    fs.writeFileSync(__dirname + '/args.json', JSON.stringify(args));
    if (fs.readFileSync(value('--image')).toString() !== 'image bytes') process.exit(2);
    if (JSON.parse(fs.readFileSync(value('--output-schema'))).properties.version.type !== 'integer') process.exit(3);
    fs.writeFileSync(value('--output-last-message'), JSON.stringify({version:1,nodes:[],roads:[],features:[]}));
  `);
  assert.equal(await codexAvailable(), true);
  const result = await analyzeMapWithCodex('data:image/png;base64,' + Buffer.from('image bytes').toString('base64'), new AbortController().signal);
  assert.equal(result.version, 1);
  const args = JSON.parse(await readFile(join(directory, 'args.json'), 'utf8'));
  assert.ok(args.includes('--ignore-user-config')); assert.ok(args.includes('--ephemeral'));
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(args.includes('features.shell_tool=false')); assert.ok(args.includes('web_search="disabled"'));
  assert.ok(args.at(-1).includes('Analyze ONLY the supplied Korean basemap image'));
  await assert.rejects(access(dirname(args[args.indexOf('--image') + 1])), { code: 'ENOENT' });
});

test('CLI failures never expose stderr or credentials in the user error', async t => {
  await fakeCli(t, "console.error('fake-sensitive-stderr'); process.exit(1)");
  assert.equal(await codexAvailable(), false);
  await assert.rejects(analyzeMapWithCodex('data:image/png;base64,aW1hZ2U=', new AbortController().signal), error => error.code === 'CODEX_FAILED' && !error.message.includes('fake-sensitive'));
});

test('malformed CLI graph output is rejected', async t => {
  await fakeCli(t, "const a=process.argv;require('node:fs').writeFileSync(a[a.indexOf('--output-last-message')+1], '{\"version\":1}');");
  await assert.rejects(analyzeMapWithCodex('data:image/png;base64,aW1hZ2U=', new AbortController().signal), { code: 'INVALID_SEGMENTATION' });
});

test('successful CLI exit without a result is an incomplete analysis, not a missing executable', async t => {
  await fakeCli(t, "process.exit(0)");
  await assert.rejects(analyzeMapWithCodex('data:image/png;base64,aW1hZ2U=', new AbortController().signal), { code: 'INVALID_SEGMENTATION' });
});

test('cancellation terminates an active CLI process and removes its image directory', async t => {
  const directory = await fakeCli(t, "require('node:fs').writeFileSync(__dirname+'/started.json',JSON.stringify({pid:process.pid,args:process.argv}));setInterval(()=>{},1000);");
  const controller = new AbortController();
  const result = analyzeMapWithCodex('data:image/png;base64,aW1hZ2U=', controller.signal);
  const rejected = assert.rejects(result, error => error.name === 'AbortError');
  let started;
  for (let i = 0; i < 100; i++) {
    try { started = JSON.parse(await readFile(join(directory, 'started.json'), 'utf8')); break; } catch { await new Promise(resolve => setTimeout(resolve, 20)); }
  }
  controller.abort(); await rejected;
  assert.ok(started, 'CLI began before cancellation');
  await assert.rejects(access(dirname(started.args[started.args.indexOf('--image') + 1])), { code: 'ENOENT' });
});
