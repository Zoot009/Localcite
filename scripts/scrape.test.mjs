// Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scrapeOne } from './scrape.mjs';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'citation-')));
const place = id => ({ title: `Biz ${id}`, place_id: `p${id}`, address: `${id} Main St, Austin, TX 78701` });

test('scrape pages until a short page, and skips saved pairs on re-run', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    const n = [20, 20, 5][calls++];
    return new Response(JSON.stringify({ local_results: Array.from({ length: n }, (_, i) => place(calls * 100 + i)) }));
  };
  await scrapeOne('dentist', 'Austin, TX');
  assert.equal(calls, 3);
  assert.equal(JSON.parse(fs.readFileSync('data/austin-tx/dentist.json', 'utf8')).results.length, 45);
  await scrapeOne('dentist', 'Austin, TX');
  assert.equal(calls, 3);   // no credits spent twice
});
