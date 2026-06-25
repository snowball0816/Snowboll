import { Debt, SnowballSchedule, MonthlyProjection } from '@/types'
import { amortizeMonth, sortSnowball } from './calculations'

export interface SnowballResult {
  schedule: SnowballSchedule[]
  projections: MonthlyProjection[]
  totalInterest: number
  totalMonths: number
  payoffDate: Date
}

/**
 * Run the Snowball engine.
 * extraMonthly: any extra amount the user can put toward debts beyond minimums.
 * oneTimePayment: optional lump sum applied in month oneTimeInMonth.
 */
export function runSnowball(
  debts: Debt[],
  extraMonthly = 0,
  oneTimePayment = 0,
  oneTimeInMonth = 1,
): SnowballResult {
  const sorted = sortSnowball(debts)
  if (sorted.length === 0) {
    return {
      schedule: [],
      projections: [],
      totalInterest: 0,
      totalMonths: 0,
      payoffDate: new Date(),
    }
  }

  // Working state
  const balances: Record<string, number> = {}
  const rates: Record<string, number> = {}
  const minimums: Record<string, number> = {}
  const names: Record<string, string> = {}
  const paidMonth: Record<string, number> = {}
  const totalInterestPerDebt: Record<string, number> = {}
  const totalPaidPerDebt: Record<string, number> = {}

  for (const d of sorted) {
    balances[d.id] = d.current_balance
    rates[d.id] = d.interest_rate
    minimums[d.id] = d.monthly_payment
    names[d.id] = `${d.entity} - ${d.name}`
    totalInterestPerDebt[d.id] = 0
    totalPaidPerDebt[d.id] = 0
  }

  const projections: MonthlyProjection[] = []
  let month = 0
  let freedPayment = 0 // Accumulated freed payments from paid debts
  const activeOrder = sorted.map((d) => d.id)

  while (activeOrder.some((id) => balances[id] > 0) && month < 600) {
    month++

    // Apply one-time payment to first active debt
    if (month === oneTimeInMonth && oneTimePayment > 0) {
      const firstActive = activeOrder.find((id) => balances[id] > 0)
      if (firstActive) {
        balances[firstActive] = Math.max(
          0,
          balances[firstActive] - oneTimePayment,
        )
        if (balances[firstActive] === 0) {
          paidMonth[firstActive] = month
          freedPayment += minimums[firstActive]
        }
      }
    }

    const totalAvailable =
      activeOrder
        .filter((id) => balances[id] > 0)
        .reduce((s, id) => s + minimums[id], 0) +
      extraMonthly +
      freedPayment

    let remaining = totalAvailable

    // Pay minimums first
    for (const id of activeOrder) {
      if (balances[id] <= 0) continue
      const minPay = Math.min(minimums[id], remaining)
      const result = amortizeMonth(balances[id], rates[id], minPay)
      balances[id] = result.newBalance
      totalInterestPerDebt[id] += result.interest
      totalPaidPerDebt[id] += minPay
      remaining -= minPay

      if (balances[id] === 0 && !paidMonth[id]) {
        paidMonth[id] = month
        freedPayment += minimums[id]
      }
    }

    // Apply extra to target debt (first active in snowball order)
    if (remaining > 0) {
      const target = activeOrder.find((id) => balances[id] > 0)
      if (target) {
        const extra = Math.min(remaining, balances[target])
        balances[target] = Math.max(0, balances[target] - extra)
        totalPaidPerDebt[target] += extra
        if (balances[target] === 0 && !paidMonth[target]) {
          paidMonth[target] = month
          freedPayment += minimums[target]
        }
      }
    }

    // Record projection
    const debtBalances: Record<string, number> = {}
    let totalBal = 0
    for (const id of activeOrder) {
      debtBalances[id] = balances[id]
      totalBal += balances[id]
    }

    const projDate = new Date()
    projDate.setMonth(projDate.getMonth() + month)

    projections.push({
      month,
      date: projDate,
      totalBalance: totalBal,
      totalInterest: Object.values(totalInterestPerDebt).reduce((a, b) => a + b, 0),
      totalPrincipal: sorted.reduce((s, d) => s + d.current_balance, 0) - totalBal,
      debtBalances,
    })
  }

  const schedule: SnowballSchedule[] = sorted.map((d, idx) => {
    const pm = paidMonth[d.id] ?? month
    const pd = new Date()
    pd.setMonth(pd.getMonth() + pm)

    return {
      debtId: d.id,
      debtName: names[d.id],
      payoffDate: pd,
      totalInterest: totalInterestPerDebt[d.id],
      totalPaid: totalPaidPerDebt[d.id],
      monthsToPayoff: pm,
      order: idx + 1,
      freedAmount: minimums[d.id],
    }
  })

  const totalInterest = Object.values(totalInterestPerDebt).reduce((a, b) => a + b, 0)
  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + month)

  return { schedule, projections, totalInterest, totalMonths: month, payoffDate }
}
