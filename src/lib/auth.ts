const SECRET = process.env.SNOWBOLL_SECRET ?? 'snowboll-dev-secret-change-me'
export const DEMO_PASSWORD = process.env.SNOWBOLL_PASSWORD ?? 'demo'
export const SESSION_COOKIE = 'snowboll-session'

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSessionToken(): Promise<string> {
  const payload = `mock-user-001:${Date.now()}`
  const sig = await hmac(payload)
  return `${payload}.${sig}`
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot < 0) return false
    const payload = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)
    const expected = await hmac(payload)
    return expected === sig
  } catch {
    return false
  }
}
