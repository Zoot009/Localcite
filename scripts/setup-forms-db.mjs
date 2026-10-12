// One-time database setup for the website's forms (new listings, claims, reviews) and its admin panel (/admin).
// Usage (from the project root): node scripts/setup-forms-db.mjs
//
// Uses the admin DATABASE_URL from .env.local, like the scraper; the website itself never sees it.
// It creates two logins for the website and saves their URLs in .env.local:
// - web_forms (WEB_FORMS_DATABASE_URL) can add rows but can't read them back or mark a listing paid or published.
// - web_admin (WEB_ADMIN_DATABASE_URL), for the admin panel, can read form rows, change their status, delete them and
//   publish a listing request. It can't change businesses any other way.
// The read-only login (web_reader) may read reviews written on the site, minus emails and ones marked rejected, to show
// them. It also makes ADMIN_SESSION_SECRET, which signs admin sign-ins; the admin email and password (ADMIN_EMAIL,
// ADMIN_PASSWORD) you add to .env.local yourself, so they never end up in the code.
// Safe to run again: tables and policies are created only if missing, and passwords are kept.
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';

process.loadEnvFile('.env.local');
const { DATABASE_URL, WEB_DATABASE_URL } = process.env;
if (!DATABASE_URL || !WEB_DATABASE_URL) throw new Error('DATABASE_URL and WEB_DATABASE_URL must be set in .env.local');

const SQL = `
-- New listings go into the existing listing_requests table (plan free or paid; publish_listing_request
-- turns a paid or approved request into a live business). The form also asks for the area and opening hours.
alter table public.listing_requests add column if not exists area text;
alter table public.listing_requests add column if not exists hours text;

create table if not exists public.claim_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  business_id bigint not null references public.businesses (id) on delete cascade,
  contact_name text not null,
  role text not null,
  email text not null,
  phone text not null,
  verify_by text not null check (verify_by in ('phone', 'email')),
  note text
);

create table if not exists public.user_reviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  business_id bigint not null references public.businesses (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  author_name text not null,
  author_email text not null
);

-- Emails and phone numbers: keep them away from Supabase's public API keys.
alter table public.claim_requests enable row level security;
alter table public.user_reviews enable row level security;
revoke all on public.claim_requests, public.user_reviews from anon, authenticated;

grant usage on schema public to web_forms;
grant insert on public.listing_requests, public.claim_requests, public.user_reviews to web_forms;

drop policy if exists "web_forms adds listing requests" on public.listing_requests;
create policy "web_forms adds listing requests" on public.listing_requests for insert to web_forms
  with check (status in ('pending', 'awaiting_payment') and business_id is null
    and stripe_session_id is null and paid_at is null and published_at is null);
drop policy if exists "web_forms adds claims" on public.claim_requests;
create policy "web_forms adds claims" on public.claim_requests for insert to web_forms with check (status = 'pending');
drop policy if exists "web_forms adds reviews" on public.user_reviews;
create policy "web_forms adds reviews" on public.user_reviews for insert to web_forms with check (status = 'pending');

-- Reviews show on the business page as soon as they're written; mark one 'rejected' to hide it.
create index if not exists user_reviews_business_idx on public.user_reviews (business_id, created_at desc);
grant select (id, business_id, rating, body, author_name, created_at) on public.user_reviews to web_reader;
drop policy if exists "web_reader reads published reviews" on public.user_reviews;
create policy "web_reader reads published reviews" on public.user_reviews for select to web_reader using (status <> 'rejected');

-- Admin panel: sees every submission, changes its status, deletes it, and publishes listings with the function
-- publish_listing_request (it adds the business; web_admin can't write to businesses itself).
grant usage on schema public to web_admin;
grant select on public.businesses, public.cities, public.categories to web_admin;
grant select, delete on public.listing_requests, public.claim_requests, public.user_reviews to web_admin;
grant update (status, category_id) on public.listing_requests to web_admin;
grant update (status) on public.claim_requests, public.user_reviews to web_admin;
grant execute on function public.publish_listing_request(bigint, text) to web_admin;
drop policy if exists "web_admin manages listing requests" on public.listing_requests;
create policy "web_admin manages listing requests" on public.listing_requests for all to web_admin using (true) with check (true);
drop policy if exists "web_admin manages claims" on public.claim_requests;
create policy "web_admin manages claims" on public.claim_requests for all to web_admin using (true) with check (true);
drop policy if exists "web_admin manages reviews" on public.user_reviews;
create policy "web_admin manages reviews" on public.user_reviews for all to web_admin using (true) with check (true);
`;

const LOGINS = [
  ['web_forms', 'WEB_FORMS_DATABASE_URL', 'Website forms: insert-only login (new listings, claims, reviews)'],
  ['web_admin', 'WEB_ADMIN_DATABASE_URL', 'Admin panel (/admin): reads, updates and deletes form submissions'],
];

// Adds KEY=value to .env.local, or replaces the line if it's there.
function setEnv(key, value, comment) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  const env = fs.readFileSync('.env.local', 'utf8');
  fs.writeFileSync('.env.local', re.test(env)
    ? env.replace(re, () => line)
    : `${env.trimEnd()}\n\n# ${comment}. Made by scripts/setup-forms-db.mjs\n${line}\n`);
  console.log(`Saved ${key} to .env.local`);
}

const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query('begin');
  const urls = [];
  for (const [role, key, comment] of LOGINS) {
    const exists = (await db.query('select 1 from pg_roles where rolname = $1', [role])).rowCount > 0;
    if (exists && process.env[key]) continue;
    const password = crypto.randomBytes(24).toString('base64url'); // letters, digits, - and _: safe inside the SQL below
    await db.query(`${exists ? 'alter' : 'create'} role ${role} with login password '${password}'`);
    // Same pooler and project as the read-only login; only the user name and password differ.
    const url = new URL(WEB_DATABASE_URL);
    url.username = url.username.replace(/^[^.]+/, role);
    url.password = password;
    urls.push([key, String(url), comment]);
  }
  await db.query(SQL);
  await db.query('commit');

  for (const [key, url, comment] of urls) setEnv(key, url, comment);
  if (!process.env.ADMIN_SESSION_SECRET) setEnv('ADMIN_SESSION_SECRET', crypto.randomBytes(32).toString('base64url'), 'Signs admin panel sign-ins');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) console.log('Add ADMIN_EMAIL and ADMIN_PASSWORD to .env.local to sign in at /admin.');
  console.log('Forms database is ready.');
} catch (err) {
  await db.query('rollback');
  throw err;
} finally {
  await db.end();
}
