import { Debt, ComparisonResult } from '@/types'
import { runSnowball } from './snowball'
import { runAvalanche } from './avalanche'

export function compareStrategies(
  debts: Debt[],
  extraMonthly = 0,
  oneTimePayment = 0,
  oneTimeInMonth = 1,
): ComparisonResult {
  const snowball = runSnowball(debts, extraMonthly, oneTimePayment, oneTimeInMonth)
  const avalanche = runAvalanche(debts, extraMonthly, oneTimePayment, oneTimeInMonth)

  return {
    snowball: {
      totalInterest: snowball.totalInterest,
      payoffDate: snowball.payoffDate,
      totalMonths: snowball.totalMonths,
      schedule: snowball.schedule,
    },
    avalanche: {
      totalInterest: avalanche.totalInterest,
      payoffDate: avalanche.payoffDate,
      totalMonths: avalanche.totalMonths,
      schedule: avalanche.schedule,
    },
    interestSavedByAvalanche: Math.max(
      0,
      snowball.totalInterest - avalanche.totalInterest,
    ),
    monthsSavedByAvalanche: Math.max(
      0,
      snowball.totalMonths - avalanche.totalMonths,
    ),
  }
}
