// Scrapes Google Maps listings through scrape.do for every niche × city → data/<city>/<niche>.json
// Usage (from the project root): npm run scrape    (token is read from SCRAPEDO_TOKEN in .env.local)
//   $env:LIMIT=5    only the first 5 niches (cheap test run)
//   $env:GL="in"    country Google answers from (default us)
// Resumable: pairs already in data/ are skipped, so just re-run after a crash or to retry failures.
// Writes JSON files only; the website now reads the Supabase database (see lib/data.ts).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const slugify = s => s.normalize('NFKD').replace(/[̀-ͯ'’]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

try { process.loadEnvFile('.env.local'); } catch {}   // optional: the token can also come from the shell
const { SCRAPEDO_TOKEN, GL = 'us', HL = 'en', LIMIT } = process.env;
const WORKERS = +(process.env.WORKERS ?? 5);      // keep at or below your scrape.do plan's concurrency
const MAX_PAGES = +(process.env.MAX_PAGES ?? 6);  // 20 places per page, 10 credits per page
const API = 'https://api.scrape.do/plugin/google/maps/search';
const lines = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));

async function fetchPage(q, start) {
  const url = `${API}?${new URLSearchParams({ token: SCRAPEDO_TOKEN, q, start, gl: GL, hl: HL })}`;
  let err;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, (err?.status === 429 ? 15000 : 3000) * attempt));   // 429 = slow down
    let res;
    try { res = await fetch(url, { signal: AbortSignal.timeout(120_000) }); }
    catch (e) { err = e; continue; }   // network error or timeout: retry
    if (res.ok) return (await res.json()).local_results ?? [];
    err = Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { status: res.status });
    if (res.status < 500 && res.status !== 429) throw err;   // bad token / bad request: retrying won't help
  }
  if (err.status === 502) return [];   // scrape.do: a 502 that survives a retry means no (more) results
  throw err;
}

export async function scrapeOne(niche, city) {
  const out = path.join('data', slugify(city), `${slugify(niche)}.json`);
  if (fs.existsSync(out)) return;
  const results = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await fetchPage(`${niche} in ${city}`, page * 20);
    results.push(...batch);
    if (batch.length < 20) break;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out + '.tmp', JSON.stringify({ niche, city, results }));
  fs.renameSync(out + '.tmp', out);   // a crash mid-write never leaves a half file that looks done
  console.log(`${String(results.length).padStart(4)}  ${niche} / ${city}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!SCRAPEDO_TOKEN) { console.error('Set SCRAPEDO_TOKEN first'); process.exit(1); }
  const niches = lines('niches.txt').slice(0, +LIMIT || undefined);
  const jobs = lines('cities.txt').flatMap(city => niches.map(niche => [niche, city]));
  if (!jobs.length) { console.error('Add at least one city to cities.txt'); process.exit(1); }
  console.log(`${jobs.length} searches, at most ${jobs.length * MAX_PAGES * 10} credits (saved pairs are skipped)`);
  let failed = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (let job; (job = jobs.shift()); ) {
      try { await scrapeOne(...job); }
      catch (e) {
        if (e.status === 401 || e.status === 403) { console.error(`scrape.do rejected the token: ${e.message}`); process.exit(1); }
        failed++;
        console.error(`FAILED ${job.join(' / ')}: ${e.message}`);
      }
    }
  }));
  console.log(failed ? `${failed} failed – run again to retry them` : 'Done. Next: npm run build');
}
