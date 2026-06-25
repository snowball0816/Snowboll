import { NextResponse } from 'next/server'

// Only available in mock/dev mode — resets in-memory store to initial mock data
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isMock = !url || url.includes('YOUR_PROJECT')
  if (!isMock) {
    return NextResponse.json({ error: 'Solo disponible en modo mock' }, { status: 403 })
  }
  global.__snowboll_debts = undefined
  global.__snowboll_payments = undefined
  global.__snowboll_purchases = undefined
  global.__snowboll_advances = undefined
  return NextResponse.json({ ok: true })
}
