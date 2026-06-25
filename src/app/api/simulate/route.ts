import { NextRequest, NextResponse } from 'next/server'
import { getActiveDebts } from '@/lib/db'
import { MOCK_USER_ID } from '@/lib/mock/data'
import { runSnowball } from '@/lib/engines/snowball'

export async function POST(req: NextRequest) {
  const { extraMonthly = 0, oneTimePayment = 0, oneTimeInMonth = 1 } =
    await req.json()

  const debts = await getActiveDebts(MOCK_USER_ID)

  const withExtra = runSnowball(debts, extraMonthly, oneTimePayment, oneTimeInMonth)
  const without  = runSnowball(debts, 0, 0)

  return NextResponse.json({
    withExtra: {
      totalInterest: withExtra.totalInterest,
      payoffDate: withExtra.payoffDate,
      totalMonths: withExtra.totalMonths,
      projections: withExtra.projections.slice(0, 60), // 5 years max for chart
    },
    without: {
      totalInterest: without.totalInterest,
      payoffDate: without.payoffDate,
      totalMonths: without.totalMonths,
      projections: without.projections.slice(0, 60),
    },
    interestSaved: Math.max(0, without.totalInterest - withExtra.totalInterest),
    monthsSaved: Math.max(0, without.totalMonths - withExtra.totalMonths),
  })
}
