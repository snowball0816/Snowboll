import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const isMock = !url || url.includes('YOUR_PROJECT')

  if (!isMock) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { error } = await supabase.from('debts').select('id').limit(1)
      return NextResponse.json({
        mode: 'supabase',
        url: url.slice(0, 40) + '…',
        hasServiceKey,
        dbTest: error ? `ERROR: ${error.message}` : 'OK',
      })
    } catch (e) {
      return NextResponse.json({ mode: 'supabase', error: String(e), hasServiceKey })
    }
  }

  return NextResponse.json({ mode: 'mock', url: url || '(empty)', hasServiceKey })
}
