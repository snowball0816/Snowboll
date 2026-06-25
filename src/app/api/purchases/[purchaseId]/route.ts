import { NextRequest, NextResponse } from 'next/server'
import { payPurchaseInstallment, updatePurchase, deletePurchase } from '@/lib/db'

type Params = { params: Promise<{ purchaseId: string }> }

// POST /api/purchases/[id] — pay one installment
export async function POST(req: NextRequest, { params }: Params) {
  const { purchaseId } = await params
  try {
    const { debtId, cuotas = 1 } = await req.json()
    const data = await payPurchaseInstallment(purchaseId, debtId, cuotas)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH /api/purchases/[id] — edit purchase
export async function PATCH(req: NextRequest, { params }: Params) {
  const { purchaseId } = await params
  try {
    const body = await req.json()
    const { debtId, ...fields } = body
    const data = await updatePurchase(purchaseId, debtId, fields)
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/purchases/[id]?debtId=xxx
export async function DELETE(req: NextRequest, { params }: Params) {
  const { purchaseId } = await params
  const debtId = req.nextUrl.searchParams.get('debtId') ?? ''
  try {
    await deletePurchase(purchaseId, debtId)
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
