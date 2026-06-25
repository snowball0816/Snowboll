import { NextRequest, NextResponse } from 'next/server'
import { getDebtWithPayments, updateDebt, deleteDebt } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const data = await getDebtWithPayments(id, MOCK_USER_ID)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    const data = await updateDebt(id, MOCK_USER_ID, body)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    await deleteDebt(id, MOCK_USER_ID)
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
