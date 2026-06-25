import { NextRequest, NextResponse } from 'next/server'
import { getPayments, createPayment } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const data = await getPayments(id)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    const payment = await createPayment(id, MOCK_USER_ID, body)
    return NextResponse.json(payment, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
