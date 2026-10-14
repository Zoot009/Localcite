import { revalidateTag } from 'next/cache'
import { DIRECTORY } from '@/lib/data'
import { sameText } from '@/lib/session'

// The central admin tool (local-citation-admin) calls this after it adds, edits or deletes a business on this website,
// so every page shows the change straight away instead of when its day-long cache runs out. Guarded by
// REVALIDATE_SECRET, the same value on both servers. Only POST: the admin's Websites tab checks for it with a GET (405).
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || !sameText(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    return new Response('Unauthorized', { status: 401 })
  }
  revalidateTag(DIRECTORY, { expire: 0 })
  return Response.json({ ok: true })
}
