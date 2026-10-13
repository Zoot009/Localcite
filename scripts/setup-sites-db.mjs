// Splits the directory between the websites that share this database.
// Usage (from the project root): node scripts/setup-sites-db.mjs
//
// Each website has an id (table `sites`) and its own read-only login. Every business belongs to one website (table
// `business_sites`), and a website's login only sees its own businesses; the other logins (web_reader, the forms and
// admin logins, the scraper) still see everything. To move a business, change its site_id in business_sites.
//
// The split: every city + category list (e.g. "Dentists in Mumbai") goes to one website in turn, so each website gets
// every city and every business type. A business lives on the website of its first list. New businesses get a website
// the same way when the scraper adds their first category (trigger on business_categories).
//
// Uses the admin DATABASE_URL from .env.local. Safe to run again: assignments and passwords are kept. Saves each
// website's login in .env.sites.local (git-ignored); it goes in that website's WEB_DATABASE_URL.
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';

process.loadEnvFile('.env.local');
const { DATABASE_URL, WEB_DATABASE_URL } = process.env;
if (!DATABASE_URL || !WEB_DATABASE_URL) throw new Error('DATABASE_URL and WEB_DATABASE_URL must be set in .env.local');

// id, domain, name, port: citybusinessfinder (postgres.js) needs Supabase's session pooler; the rest use the transaction pooler.
const SITES = [
  [1, 'cityservicelisting.com', 'CityServiceListing', 6543],
  [2, 'neighbourhoodlisting.com', 'Neighbourhood Listing', 6543],
  [3, 'citybusinessfinder.com', 'City Business Finder', 5432],
  [4, 'serviceproviderdirectory.com', 'Service Provider Directory', 6543],
  [5, 'localcitationdirectory.com', 'Local Citation Directory', 6543],
];
const loginFor = domain => `site_${domain.split('.')[0]}`;

// Sent as one batch, so the brief locks on businesses and business_categories are held for milliseconds, not round trips.
const SQL = `
begin;
set local lock_timeout = '5s';

create table if not exists public.sites (
  id smallint primary key,
  domain text not null unique,
  name text not null,
  login text not null unique
);
create table if not exists public.business_sites (
  business_id bigint primary key references public.businesses (id) on delete cascade,
  site_id smallint not null references public.sites (id)
);
create index if not exists business_sites_site_idx on public.business_sites (site_id, business_id);
alter table public.sites enable row level security;
alter table public.business_sites enable row level security;
revoke all on public.sites, public.business_sites from anon, authenticated;

-- The websites' logins are members of site_readers, which reads what web_reader reads.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'site_readers') then create role site_readers nologin; end if;
end $$;
grant web_reader to site_readers;
grant select on public.sites, public.business_sites to site_readers, web_admin;
drop policy if exists "logins read sites" on public.sites;
create policy "logins read sites" on public.sites for select to site_readers, web_admin using (true);
drop policy if exists "logins read business sites" on public.business_sites;
create policy "logins read business sites" on public.business_sites for select to site_readers, web_admin using (true);

-- A website's login sees only its own businesses. Restrictive: narrows the existing "public read" policies for these
-- logins only.
drop policy if exists "website sees its businesses" on public.businesses;
create policy "website sees its businesses" on public.businesses as restrictive for select to site_readers
  using (id in (select business_id from public.business_sites where site_id = (select id from public.sites where login = current_user)));
drop policy if exists "website sees its businesses" on public.business_categories;
create policy "website sees its businesses" on public.business_categories as restrictive for select to site_readers
  using (business_id in (select business_id from public.business_sites where site_id = (select id from public.sites where login = current_user)));

-- New businesses: the website whose turn their first list is.
create or replace function public.assign_business_site() returns trigger
language plpgsql security definer set search_path = public as $$
declare ids smallint[] := array(select id from sites order by id);
begin
  if cardinality(ids) > 0 then
    insert into business_sites (business_id, site_id)
    values (new.business_id, ids[1 + (new.city_id + new.category_id) % cardinality(ids)])
    on conflict (business_id) do nothing;
  end if;
  return null;
end $$;
revoke all on function public.assign_business_site() from public, anon, authenticated; -- Supabase grants these by default
drop trigger if exists assign_business_site on public.business_categories;
create trigger assign_business_site after insert on public.business_categories
  for each row execute function public.assign_business_site();
commit;
`;

const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
db.on('error', err => console.error('connection lost:', err.message)); // the server ends the session; nothing half-done stays
await db.connect();
// If this script's connection drops mid-way, the server ends the session within 15s instead of holding its locks.
await db.query(`set idle_in_transaction_session_timeout = '15s'; set statement_timeout = '5min'`);
try {
  await db.query(SQL);

  for (const [id, domain, name] of SITES) {
    await db.query(
      `insert into public.sites (id, domain, name, login) values ($1, $2, $3, $4)
       on conflict (id) do update set domain = excluded.domain, name = excluded.name, login = excluded.login`,
      [id, domain, name, loginFor(domain)],
    );
  }

  // Existing businesses: the website whose turn their first list (lowest category id) is. Kept if already assigned.
  const { rowCount } = await db.query(`
    insert into public.business_sites (business_id, site_id)
    select f.business_id, s.ids[1 + (f.city_id + f.category_id) % cardinality(s.ids)]
    from (select distinct on (business_id) business_id, city_id, category_id
          from public.business_categories order by business_id, category_id) f,
         (select array(select id from public.sites order by id) ids) s
    on conflict (business_id) do nothing`);
  console.log(`Assigned ${rowCount} businesses to a website.`);

  // One login per website. A new password only when the login is new or its URL isn't saved yet.
  const saved = fs.existsSync('.env.sites.local') ? fs.readFileSync('.env.sites.local', 'utf8') : '';
  const lines = ['# Each website\'s database login (made by scripts/setup-sites-db.mjs). Put it in that website\'s WEB_DATABASE_URL.'];
  for (const [id, domain, , port] of SITES) {
    const login = loginFor(domain);
    const key = `SITE_${id}_WEB_DATABASE_URL`;
    let url = saved.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1];
    const exists = (await db.query('select 1 from pg_roles where rolname = $1', [login])).rowCount > 0;
    if (!exists || !url) {
      const password = crypto.randomBytes(24).toString('base64url'); // letters, digits, - and _: safe inside the SQL below
      await db.query(`${exists ? 'alter' : 'create'} role ${login} with login password '${password}'`);
      // Same project and pooler as the current read-only login; only the user name, password and port differ.
      const u = new URL(WEB_DATABASE_URL);
      u.username = u.username.replace(/^[^.]+/, login);
      u.password = password;
      u.port = String(port);
      url = String(u);
    }
    await db.query(`grant site_readers to ${login}`);
    lines.push('', `# Website ${id}: ${domain}`, `${key}=${url}`);
  }
  fs.writeFileSync('.env.sites.local', `${lines.join('\n')}\n`);
  console.log('Saved the websites\' logins to .env.sites.local');

  const { rows } = await db.query(`select s.id, s.domain, count(b.business_id)::int businesses
    from public.sites s left join public.business_sites b on b.site_id = s.id group by 1, 2 order by 1`);
  for (const r of rows) console.log(`  Website ${r.id} (${r.domain}): ${r.businesses} businesses`);
} finally {
  await db.end();
}
