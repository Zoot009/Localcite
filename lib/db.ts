import { Pool } from 'pg'

// Read-only login (SELECT on the directory tables only). Never use the admin DATABASE_URL here.
const url = process.env.WEB_DATABASE_URL
if (!url) throw new Error('Set WEB_DATABASE_URL in .env.local (read-only Supabase login)')

// One pool per server process; dev hot-reload would otherwise open a new pool on every edit.
const g = globalThis as unknown as { __pool?: Pool; __formsPool?: Pool; __adminPool?: Pool }
const pool = (g.__pool ??= createPool(url))

function createPool(connectionString: string) {
  const p = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4, connectionTimeoutMillis: 10_000 })
  // The pooler sometimes drops idle connections. Without this listener that error would crash the whole server.
  p.on('error', err => console.warn('[db] idle connection dropped:', err.message))
  return p
}

// Network blips (connection reset, DNS hiccup, timeout) are retried after 1s, 2s and 4s; real SQL errors fail immediately.
const TRANSIENT = new Set(['ECONNRESET', 'EAI_AGAIN', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE', '57P01', '08006', '08001'])

export async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return (await pool.query(text, params)).rows as T[]
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      const transient = TRANSIENT.has(code) || /timeout|terminated|Connection terminated/i.test((err as Error).message)
      if (!transient || attempt >= 3) throw err
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
}

// Form submissions (new listings, claims, reviews) use a second, insert-only login made by scripts/setup-forms-db.mjs:
// it can add rows but not read them back. No retries: an insert that timed out may still have been saved.
export async function insert(text: string, params: unknown[] = []) {
  const formsUrl = process.env.WEB_FORMS_DATABASE_URL
  if (!formsUrl) throw new Error('Set WEB_FORMS_DATABASE_URL in .env.local (run: node scripts/setup-forms-db.mjs)')
  await (g.__formsPool ??= createPool(formsUrl)).query(text, params)
}

// The admin panel (app/admin) uses a third login, also made by scripts/setup-forms-db.mjs: it can read form submissions,
// change their status, delete them and publish listings. Only call it after requireAdmin() (app/admin/auth.ts).
export async function adminSql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const adminUrl = process.env.WEB_ADMIN_DATABASE_URL
  if (!adminUrl) throw new Error('Set WEB_ADMIN_DATABASE_URL in .env.local (run: node scripts/setup-forms-db.mjs)')
  return (await (g.__adminPool ??= createPool(adminUrl)).query(text, params)).rows as T[]
}
