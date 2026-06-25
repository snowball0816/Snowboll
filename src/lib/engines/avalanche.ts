import { Debt, AvalancheSchedule, MonthlyProjection } from '@/types'
import { amortizeMonth, sortAvalanche } from './calculations'

export interface AvalancheResult {
  schedule: AvalancheSchedule[]
  projections: MonthlyProjection[]
  totalInterest: number
  totalMonths: number
  payoffDate: Date
}

export function runAvalanche(
  debts: Debt[],
  extraMonthly = 0,
  oneTimePayment = 0,
  oneTimeInMonth = 1,
): AvalancheResult {
  const sorted = sortAvalanche(debts)
  if (sorted.length === 0) {
    return {
      schedule: [],
      projections: [],
      totalInterest: 0,
      totalMonths: 0,
      payoffDate: new Date(),
    }
  }

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
  let freedPayment = 0
  const activeOrder = sorted.map((d) => d.id)

  while (activeOrder.some((id) => balances[id] > 0) && month < 600) {
    month++

    if (month === oneTimeInMonth && oneTimePayment > 0) {
      const firstActive = activeOrder.find((id) => balances[id] > 0)
      if (firstActive) {
        balances[firstActive] = Math.max(0, balances[firstActive] - oneTimePayment)
        if (balances[firstActive] === 0 && !paidMonth[firstActive]) {
          paidMonth[firstActive] = month
          freedPayment += minimums[firstActive]
        }
      }
    }

    let remaining =
      activeOrder
        .filter((id) => balances[id] > 0)
        .reduce((s, id) => s + minimums[id], 0) +
      extraMonthly +
      freedPayment

    // Pay minimums
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

    // Extra to highest rate (first in sorted avalanche order)
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

  const schedule: AvalancheSchedule[] = sorted.map((d, idx) => {
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
      interestSaved: 0,
    }
  })

  const totalInterest = Object.values(totalInterestPerDebt).reduce((a, b) => a + b, 0)
  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + month)

  return { schedule, projections, totalInterest, totalMonths: month, payoffDate }
}
