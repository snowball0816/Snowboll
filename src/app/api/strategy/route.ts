import { NextRequest, NextResponse } from 'next/server'
import { getActiveDebts } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { compareStrategies } from '@/lib/engines/comparison'

export async function GET(req: NextRequest) {
  const extra = Number(req.nextUrl.searchParams.get('extra') ?? 0)
  try {
    const debts = await getActiveDebts(MOCK_USER_ID)
    const result = compareStrategies(debts, extra)
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
