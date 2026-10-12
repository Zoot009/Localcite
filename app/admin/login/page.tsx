import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo, Wordmark } from '@/components/icons'
import { LoginForm } from '../ui'

export const metadata: Metadata = { title: 'Admin sign in' }

export default function AdminLoginPage() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="card w-full max-w-sm p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-lg"><Logo /><Wordmark /></Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage listings, claims and reviews.</p>
        <LoginForm />
      </div>
    </main>
  )
}
