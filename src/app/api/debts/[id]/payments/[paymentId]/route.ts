import { NextRequest, NextResponse } from 'next/server'
import { updatePayment, deletePayment } from '@/lib/db'

type Params = { params: Promise<{ id: string; paymentId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { paymentId, id } = await params
  try {
    const body = await req.json()
    const data = await updatePayment(paymentId, id, body)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { paymentId, id } = await params
  try {
    await deletePayment(paymentId, id)
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
