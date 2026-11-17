// Minimal test harness for the detection engine. Run with: node test/run.js
// Loads the browser-less modules into a global and checks that each simulated
// transform is identified correctly.
const fs = require('fs');
const path = require('path');

globalThis.UPROBE = {};
for (const f of [
  '../src/data/bestfit.js',
  '../src/data/probes.js',
  '../src/lib/transforms.js',
  '../src/lib/detect.js',
]) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(__dirname, f), 'utf8'));
}
const U = globalThis.UPROBE;

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('  ok   ' + name);
  } else {
    failures += 1;
    console.log('  FAIL ' + name + (detail ? '  — ' + detail : ''));
  }
}

function bestfit(s) {
  let o = '';
  for (const c of s) {
    const k = c.codePointAt(0).toString(16);
    o += U.bestfit[k] !== undefined ? U.bestfit[k] : c;
  }
  return o;
}

const cases = [
  ['NFKC normalizer', (s) => s.normalize('NFKC'), ['normalization']],
  ['NFKD normalizer', (s) => s.normalize('NFKD'), ['normalization']],
  ['Uppercasing', (s) => s.toUpperCase(), ['uppercasing']],
  ['Lowercasing', (s) => s.toLowerCase(), ['lowercasing']],
  ['Windows best-fit', bestfit, ['bestfit']],
  ['No transform', (s) => s, []],
];

console.log('detection engine');
for (const [name, fn, expected] of cases) {
  const inj = U.buildInjection(U.probes);
  const report = U.scan(fn(inj.value), inj);
  const got = report.active.slice().sort().join(',');
  const want = expected.slice().sort().join(',');
  check(name, got === want, `active=[${got}] expected [${want}]`);
}

// Specific behaviours the report depends on.
const inj = U.buildInjection(U.probes);
const bf = U.scan(bestfit(inj.value), inj);
const inf = bf.rows.find((r) => r.cp === 'U+221E');
check('infinity is best-fit only', inf.transforms.includes('bestfit') && !inf.transforms.includes('nfkc'));

const up = U.scan(inj.value.toUpperCase(), inj);
const sharp = up.rows.find((r) => r.cp === 'U+00DF');
check('sharp s grows when uppercased', sharp.observed === 'SS' && sharp.grew === true);

const reflect = U.scan(inj.value, inj);
check('reflected value is all unchanged', reflect.rows.every((r) => r.status === 'unchanged'));

const partial = U.scan('nothing here', inj);
check('missing value is not-observed', partial.rows.every((r) => r.status === 'not-observed') && partial.anyObserved === false);

console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
process.exit(failures ? 1 : 0);
