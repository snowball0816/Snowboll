import { NextRequest, NextResponse } from 'next/server'
import { getDebts, createDebt } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'

export async function GET() {
  try {
    const data = await getDebts(MOCK_USER_ID)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await createDebt(MOCK_USER_ID, body)
    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
