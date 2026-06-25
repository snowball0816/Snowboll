import { NextRequest, NextResponse } from 'next/server'
import { DEMO_PASSWORD, createSessionToken, SESSION_COOKIE } from '@/lib/auth'

const OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { password?: string }
  if (body.password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }
  const token = await createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, OPTS)
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
